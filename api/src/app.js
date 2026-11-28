import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

const TOKEN_TTL = '7d';
const VERIFICATION_HOURS = 24;
const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so both login failures cost the same.
const DUMMY_HASH = bcrypt.hashSync('infloop-unknown-account', 12);

class HttpError extends Error {
  constructor(status, message, fields, code) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}

const hashToken = token => createHash('sha256').update(token).digest('hex');

const publicUser = row => ({ id: row.id, email: row.email, name: row.name, role: row.role, createdAt: row.created_at });

function readEmail(body) {
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!EMAIL.test(email) || email.length > 254) throw new HttpError(400, 'Check the highlighted fields.', { email: 'Enter a valid email address.' });
  return email;
}

function readCredentials(body, { signup }) {
  const input = body && typeof body === 'object' ? body : {};
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const fields = {};
  if (!EMAIL.test(email) || email.length > 254) fields.email = 'Enter a valid email address.';
  if (signup) {
    if (!name || name.length > 100) fields.name = 'Enter your name (100 characters or fewer).';
    // bcrypt only reads the first 72 bytes of a password.
    if (password.length < 8 || Buffer.byteLength(password) > 72) fields.password = 'Use 8 to 72 characters.';
  } else if (!password) {
    fields.password = 'Enter your password.';
  }
  if (Object.keys(fields).length) throw new HttpError(400, 'Check the highlighted fields.', fields);
  return { email, password, name };
}

export function createApp({ pool, jwtSecret, sendEmail, appUrl, corsOrigins = [], trustProxy = false, authRateLimit = { windowMs: 15 * 60 * 1000, limit: 30 } }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxy);
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }));
  app.use(express.json({ limit: '10kb' }));

  const sign = user => jwt.sign({ sub: user.id }, jwtSecret, { algorithm: 'HS256', expiresIn: TOKEN_TTL });

  async function requireUser(req, _res, next) {
    const [scheme, token] = (req.get('authorization') || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Log in to continue.');
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    } catch {
      throw new HttpError(401, 'Your session has expired. Log in again.');
    }
    const { rows } = await pool.query('SELECT id, email, name, role, created_at FROM users WHERE id = $1 AND email_verified_at IS NOT NULL', [payload.sub]);
    if (!rows[0]) throw new HttpError(401, 'Your session has expired. Log in again.');
    req.user = rows[0];
    next();
  }

  app.get('/health', async (_req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  const authLimiter = authRateLimit
    ? rateLimit({ ...authRateLimit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } })
    : (_req, _res, next) => next();

  // Replaces any earlier link for the account, so only the newest email works.
  async function issueVerification(db, user) {
    const token = randomBytes(32).toString('base64url');
    await db.query('DELETE FROM email_verifications WHERE user_id = $1', [user.id]);
    await db.query(
      `INSERT INTO email_verifications (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(hours => $3))`,
      [hashToken(token), user.id, VERIFICATION_HOURS],
    );
    return {
      to: user.email,
      subject: 'Verify your email for infloop',
      // No sign-up input other than the address goes into the email: anyone can sign up with someone else's address.
      text: `Confirm this email address to finish creating your infloop creator account:\n\n${appUrl}/verify/?token=${token}\n\n`
        + `The link works once and expires in ${VERIFICATION_HOURS} hours. If you did not sign up for infloop, ignore this email and no account will be activated.`,
    };
  }

  async function deliver(message) {
    try {
      await sendEmail(message);
    } catch (error) {
      console.error('Sending email failed:', error.message);
      throw new HttpError(502, 'We could not send the email. Try again in a moment.');
    }
  }

  // The reply is the same whether or not the email already has an account.
  app.post('/auth/signup', authLimiter, async (req, res) => {
    const { email, password, name } = readCredentials(req.body, { signup: true });
    const passwordHash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    let message;
    try {
      await client.query('BEGIN');
      // An unverified account does not reserve its address: a new sign-up replaces it.
      const { rows } = await client.query(
        `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
         ON CONFLICT (lower(email)) DO UPDATE
           SET email = EXCLUDED.email, name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
           WHERE users.email_verified_at IS NULL
         RETURNING id, email, name`,
        [email, name, passwordHash],
      );
      message = rows[0]
        ? await issueVerification(client, rows[0])
        : {
          to: email,
          subject: 'You already have an infloop account',
          text: `Someone tried to sign up for infloop with this email address, but it already has an account.\n\nLog in here: ${appUrl}/login/\n\nIf this was not you, ignore this email.`,
        };
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    await deliver(message);
    res.status(202).json({ email, message: 'Check your email for a link to verify your address.' });
  });

  app.post('/auth/verify', authLimiter, async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'DELETE FROM email_verifications WHERE token_hash = $1 AND expires_at > now() RETURNING user_id',
        [hashToken(token)],
      );
      if (!rows[0]) throw new HttpError(400, 'This verification link is invalid or has expired. Request a new one.', undefined, 'invalid_verification_token');
      const userId = rows[0].user_id;
      const user = await client.query('UPDATE users SET email_verified_at = now() WHERE id = $1 RETURNING email', [userId]);
      await client.query('DELETE FROM email_verifications WHERE user_id = $1', [userId]);
      await client.query(
        `INSERT INTO campaign_creators (campaign_id, creator_id, status)
         SELECT id, $1,
                CASE WHEN ends_on < current_date THEN 'completed'
                     WHEN starts_on > current_date THEN 'invited'
                     ELSE 'active' END
         FROM campaigns WHERE is_sample
         ON CONFLICT DO NOTHING`,
        [userId],
      );
      await client.query('COMMIT');
      res.json({ email: user.rows[0].email, message: 'Your email is verified. You can log in now.' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // Always answers the same way, so it does not reveal which emails have accounts.
  app.post('/auth/resend-verification', authLimiter, async (req, res) => {
    const email = readEmail(req.body);
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.name FROM users u
       WHERE lower(u.email) = lower($1) AND u.email_verified_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM email_verifications v
                         WHERE v.user_id = u.id AND v.created_at > now() - make_interval(secs => $2))`,
      [email, RESEND_COOLDOWN_SECONDS],
    );
    // Not awaited: waiting for the provider only for pending accounts would reveal them by timing or failure.
    if (rows[0]) {
      const message = await issueVerification(pool, rows[0]);
      sendEmail(message).catch(error => console.error('Sending email failed:', error.message));
    }
    res.json({ message: 'If that address has an account waiting to be verified, a new link is on its way.' });
  });

  app.post('/auth/login', authLimiter, async (req, res) => {
    const { email, password } = readCredentials(req.body, { signup: false });
    const { rows } = await pool.query('SELECT id, email, name, role, created_at, password_hash, email_verified_at FROM users WHERE lower(email) = lower($1)', [email]);
    const matches = await bcrypt.compare(password, rows[0]?.password_hash ?? DUMMY_HASH);
    if (!rows[0] || !matches) throw new HttpError(401, 'That email and password do not match.');
    if (!rows[0].email_verified_at) throw new HttpError(403, 'Verify your email before logging in. Use the link we emailed you, or request a new one.', undefined, 'email_not_verified');
    res.json({ token: sign(rows[0]), user: publicUser(rows[0]) });
  });

  app.get('/auth/me', requireUser, (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  app.get('/campaigns', requireUser, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT c.id, c.brand, c.title, c.goal, c.platform, c.deliverables, c.fee_cents,
              to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on,
              c.is_sample, cc.status
       FROM campaign_creators cc JOIN campaigns c ON c.id = cc.campaign_id
       WHERE cc.creator_id = $1
       ORDER BY array_position(ARRAY['active', 'invited', 'completed'], cc.status), c.starts_on, c.title`,
      [req.user.id],
    );
    res.json({
      campaigns: rows.map(row => ({
        id: row.id, brand: row.brand, title: row.title, goal: row.goal, platform: row.platform,
        deliverables: row.deliverables, feeCents: row.fee_cents, startsOn: row.starts_on, endsOn: row.ends_on,
        status: row.status, isSample: row.is_sample,
      })),
    });
  });

  app.use((_req, _res, next) => next(new HttpError(404, 'Not found.')));

  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, ...(error.code && { code: error.code }), ...(error.fields && { fields: error.fields }) });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  });

  return app;
}

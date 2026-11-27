import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';

const TOKEN_TTL = '7d';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so both login failures cost the same.
const DUMMY_HASH = bcrypt.hashSync('infloop-unknown-account', 12);

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const publicUser = row => ({ id: row.id, email: row.email, name: row.name, role: row.role, createdAt: row.created_at });

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

export function createApp({ pool, jwtSecret, corsOrigins = [], authRateLimit = { windowMs: 15 * 60 * 1000, limit: 30 } }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
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
    const { rows } = await pool.query('SELECT id, email, name, role, created_at FROM users WHERE id = $1', [payload.sub]);
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

  app.post('/auth/signup', authLimiter, async (req, res) => {
    const { email, password, name } = readCredentials(req.body, { signup: true });
    const passwordHash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
         ON CONFLICT (lower(email)) DO NOTHING
         RETURNING id, email, name, role, created_at`,
        [email, name, passwordHash],
      );
      if (!rows[0]) throw new HttpError(409, 'An account with this email already exists. Log in instead.', { email: 'This email is already registered.' });
      await client.query(
        `INSERT INTO campaign_creators (campaign_id, creator_id, status)
         SELECT id, $1,
                CASE WHEN ends_on < current_date THEN 'completed'
                     WHEN starts_on > current_date THEN 'invited'
                     ELSE 'active' END
         FROM campaigns WHERE is_sample`,
        [rows[0].id],
      );
      await client.query('COMMIT');
      res.status(201).json({ token: sign(rows[0]), user: publicUser(rows[0]) });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  app.post('/auth/login', authLimiter, async (req, res) => {
    const { email, password } = readCredentials(req.body, { signup: false });
    const { rows } = await pool.query('SELECT id, email, name, role, created_at, password_hash FROM users WHERE lower(email) = lower($1)', [email]);
    const matches = await bcrypt.compare(password, rows[0]?.password_hash ?? DUMMY_HASH);
    if (!rows[0] || !matches) throw new HttpError(401, 'That email and password do not match.');
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
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, ...(error.fields && { fields: error.fields }) });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  });

  return app;
}

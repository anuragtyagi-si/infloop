import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { createPool, migrate } from '../src/db.js';

// Runs against a throwaway database created on the server in DATABASE_URL.
const adminUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/postgres';
const database = `infloop_test_${process.pid}_${Date.now()}`;
const jwtSecret = 'test-secret-test-secret-test-secret-123';
let pool, server, base;
const outbox = [];
let failEmail = false;
const sendEmail = async message => { if (failEmail) throw new Error('provider down'); outbox.push(message); };
const linkToken = message => new URL(message.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');

// Signs up, follows the emailed link, and logs in.
async function register(details) {
  await call('POST', '/auth/signup', { body: details });
  await call('POST', '/auth/verify', { body: { token: linkToken(outbox.at(-1)) } });
  return (await call('POST', '/auth/login', { body: { email: details.email, password: details.password } })).body;
}

async function admin(sql) {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try { await client.query(sql); } finally { await client.end(); }
}

async function call(method, path, { body, token, raw } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

const account = { name: 'Maya Chen', email: 'maya@example.com', password: 'correct-horse-9' };

before(async () => {
  await admin(`CREATE DATABASE ${database}`);
  const url = new URL(adminUrl);
  url.pathname = `/${database}`;
  pool = createPool({ databaseUrl: url.toString() });
  assert.deepEqual(await migrate(pool), ['001_init.sql', '002_sample_campaigns.sql', '003_email_verification.sql']);
  assert.deepEqual(await migrate(pool), [], 'migrations are applied once');
  const app = createApp({ pool, jwtSecret, sendEmail, appUrl: 'https://site.example/infloop', corsOrigins: ['https://anuragtyagi-si.github.io'], authRateLimit: false });
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await pool.end();
  await admin(`DROP DATABASE ${database}`);
});

test('health reports a reachable database', async () => {
  assert.deepEqual((await call('GET', '/health')).body, { status: 'ok' });
});

test('sign-up validates input', async () => {
  const { status, body } = await call('POST', '/auth/signup', { body: { name: '', email: 'nope', password: 'short' } });
  assert.equal(status, 400);
  assert.deepEqual(Object.keys(body.fields).sort(), ['email', 'name', 'password']);
  assert.equal((await call('POST', '/auth/signup', { raw: '{bad', body: null })).status, 400);
});

test('sign-up stores an unverified account and emails a link instead of a session', async () => {
  const { status, body } = await call('POST', '/auth/signup', { body: account });
  assert.equal(status, 202);
  assert.equal(body.token, undefined);
  assert.equal(body.user, undefined);
  const { rows } = await pool.query('SELECT id, password_hash, email_verified_at FROM users WHERE email = $1', [account.email]);
  assert.match(rows[0].password_hash, /^\$2[aby]\$12\$/);
  assert.equal(rows[0].email_verified_at, null);
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, account.email);
  assert.match(outbox[0].text, /https:\/\/site\.example\/infloop\/verify\/\?token=[\w-]{43}/);
  const stored = await pool.query('SELECT token_hash, expires_at - now() AS ttl FROM email_verifications WHERE user_id = $1', [rows[0].id]);
  assert.equal(stored.rows.length, 1);
  assert.notEqual(stored.rows[0].token_hash, linkToken(outbox[0]), 'only a hash of the token is stored');
  assert.equal(stored.rows[0].ttl.hours ?? 0, 23);
});

test('an unverified account cannot log in or use a forged session', async () => {
  const login = await call('POST', '/auth/login', { body: { email: account.email, password: account.password } });
  assert.equal(login.status, 403);
  assert.equal(login.body.code, 'email_not_verified');
  assert.equal(login.body.token, undefined);
  const wrong = await call('POST', '/auth/login', { body: { email: account.email, password: 'wrong-password' } });
  assert.equal(wrong.status, 401, 'the unverified state is only shown to someone with the password');
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [account.email]);
  const session = jwt.sign({ sub: rows[0].id }, jwtSecret);
  assert.equal((await call('GET', '/auth/me', { token: session })).status, 401);
});

test('an unverified sign-up does not reserve the address', async () => {
  const squatter = { name: 'Not Maya', email: 'MAYA@example.com', password: 'squatter-pass-1' };
  assert.equal((await call('POST', '/auth/signup', { body: squatter })).status, 202);
  const squatterToken = linkToken(outbox.at(-1));
  assert.equal((await call('POST', '/auth/signup', { body: account })).status, 202);
  assert.equal((await pool.query('SELECT 1 FROM users WHERE lower(email) = $1', [account.email])).rowCount, 1);
  assert.equal((await call('POST', '/auth/verify', { body: { token: squatterToken } })).status, 400, 'the earlier link stops working');
  const login = await call('POST', '/auth/login', { body: { email: account.email, password: squatter.password } });
  assert.equal(login.status, 401, 'the earlier password is replaced');
});

test('resend issues a new link, replaces the old one, and reveals nothing', async () => {
  const before = outbox.length;
  const oldToken = linkToken(outbox.at(-1));
  const cooling = await call('POST', '/auth/resend-verification', { body: { email: account.email } });
  assert.equal(cooling.status, 200);
  assert.equal(outbox.length, before, 'no second email within the cooldown');
  await pool.query(`UPDATE email_verifications SET created_at = now() - interval '2 minutes'`);
  const sent = await call('POST', '/auth/resend-verification', { body: { email: 'Maya@Example.com' } });
  const unknown = await call('POST', '/auth/resend-verification', { body: { email: 'nobody@example.com' } });
  assert.deepEqual(sent, { ...unknown, headers: sent.headers });
  assert.equal(outbox.length, before + 1);
  assert.equal((await call('POST', '/auth/verify', { body: { token: oldToken } })).status, 400);
  assert.equal((await call('POST', '/auth/resend-verification', { body: { email: 'nope' } })).status, 400);
});

test('verification rejects bad and expired links', async () => {
  for (const token of [undefined, '', 'garbage', 42]) {
    const { status, body } = await call('POST', '/auth/verify', { body: { token } });
    assert.equal(status, 400);
    assert.equal(body.code, 'invalid_verification_token');
  }
  await pool.query(`UPDATE email_verifications SET expires_at = now() - interval '1 second'`);
  assert.equal((await call('POST', '/auth/verify', { body: { token: linkToken(outbox.at(-1)) } })).status, 400);
  await pool.query(`UPDATE email_verifications SET expires_at = now() + interval '1 hour'`);
});

test('the link verifies the account once, then login works', async () => {
  const token = linkToken(outbox.at(-1));
  const verified = await call('POST', '/auth/verify', { body: { token } });
  assert.equal(verified.status, 200);
  assert.equal(verified.body.email, account.email);
  assert.equal(verified.body.token, undefined, 'verifying does not log in');
  assert.equal((await call('POST', '/auth/verify', { body: { token } })).status, 400, 'the link is single-use');
  assert.equal((await pool.query('SELECT 1 FROM email_verifications')).rowCount, 0);
  const ok = await call('POST', '/auth/login', { body: { email: 'Maya@Example.com', password: account.password } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.email, account.email);
  assert.equal(ok.body.user.role, 'creator');
  assert.equal(ok.body.user.password_hash, undefined);
  const me = await call('GET', '/auth/me', { token: ok.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.id, ok.body.user.id);
});

test('signing up with a verified email changes nothing and answers like a new sign-up', async () => {
  const before = outbox.length;
  const again = await call('POST', '/auth/signup', { body: { ...account, email: 'MAYA@example.com', password: 'takeover-pass-1' } });
  const fresh = await call('POST', '/auth/signup', { body: { name: 'Ana', email: 'ana@example.com', password: 'another-pass-2' } });
  assert.equal(again.status, 202);
  assert.equal(again.body.message, fresh.body.message);
  assert.equal(outbox.length, before + 2);
  assert.doesNotMatch(outbox[before].text, /token=/);
  assert.equal((await call('POST', '/auth/login', { body: { email: account.email, password: 'takeover-pass-1' } })).status, 401);
  assert.equal((await call('POST', '/auth/login', { body: account })).status, 200);
  assert.equal((await call('POST', '/auth/resend-verification', { body: { email: account.email } })).status, 200);
  assert.equal(outbox.length, before + 2, 'verified accounts get no verification email');
});

test('verification emails carry no text chosen by whoever signed up', async () => {
  outbox.length = 0;
  const res = await call('POST', '/auth/signup', {
    body: { name: 'https://evil.example/claim', email: 'bystander@example.com', password: 'password123' },
  });
  assert.equal(res.status, 202);
  assert.ok(!outbox[0].text.includes('evil.example'));
});

test('a failed email send is reported and can be retried', async () => {
  failEmail = true;
  const details = { name: 'Sam', email: 'sam@example.com', password: 'another-pass-3' };
  assert.equal((await call('POST', '/auth/signup', { body: details })).status, 502);
  failEmail = false;
  assert.equal((await call('POST', '/auth/signup', { body: details })).status, 202);
  assert.equal(outbox.at(-1).to, details.email);
});

test('login rejects wrong or unknown credentials alike', async () => {
  const wrong = await call('POST', '/auth/login', { body: { email: account.email, password: 'wrong-password' } });
  const unknown = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'wrong-password' } });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.body.error, unknown.body.error);
});

test('campaigns require a valid token', async () => {
  assert.equal((await call('GET', '/campaigns')).status, 401);
  assert.equal((await call('GET', '/campaigns', { token: 'garbage' })).status, 401);
  const forged = jwt.sign({ sub: '00000000-0000-0000-0000-000000000000' }, 'another-secret-another-secret-another');
  assert.equal((await call('GET', '/campaigns', { token: forged })).status, 401);
  const expired = jwt.sign({ sub: '00000000-0000-0000-0000-000000000000' }, jwtSecret, { expiresIn: -10 });
  assert.equal((await call('GET', '/campaigns', { token: expired })).status, 401);
});

test('a creator sees only their own campaigns, active first', async () => {
  const maya = (await call('POST', '/auth/login', { body: account })).body;
  const other = await register({ name: 'Leo', email: 'leo@example.com', password: 'another-pass-1' });
  await pool.query(
    `WITH c AS (INSERT INTO campaigns (brand, title, goal, platform, deliverables, fee_cents, starts_on, ends_on)
                VALUES ('Private Brand', 'Leo only', 'Awareness', 'TikTok', '1 video', 50000, current_date, current_date + 7) RETURNING id)
     INSERT INTO campaign_creators (campaign_id, creator_id, status) SELECT id, $1, 'active' FROM c`,
    [other.user.id],
  );
  const mine = (await call('GET', '/campaigns', { token: maya.token })).body.campaigns;
  const theirs = (await call('GET', '/campaigns', { token: other.token })).body.campaigns;
  assert.equal(mine.length, 5);
  assert.equal(theirs.length, 6);
  assert.ok(!mine.some(campaign => campaign.title === 'Leo only'));
  assert.deepEqual(mine.map(campaign => campaign.status), ['active', 'active', 'invited', 'invited', 'completed']);
  assert.deepEqual(Object.keys(mine[0]).sort(), ['brand', 'deliverables', 'endsOn', 'feeCents', 'goal', 'id', 'isSample', 'platform', 'startsOn', 'status', 'title']);
  assert.match(mine[0].startsOn, /^\d{4}-\d{2}-\d{2}$/);
});

test('CORS allows the site origin only', async () => {
  const allowed = await fetch(`${base}/health`, { headers: { Origin: 'https://anuragtyagi-si.github.io' } });
  const denied = await fetch(`${base}/health`, { headers: { Origin: 'https://evil.example' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://anuragtyagi-si.github.io');
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});

test('unknown routes return JSON 404', async () => {
  const { status, body } = await call('GET', '/nope');
  assert.equal(status, 404);
  assert.ok(body.error);
});

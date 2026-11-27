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
  assert.deepEqual(await migrate(pool), ['001_init.sql', '002_sample_campaigns.sql']);
  assert.deepEqual(await migrate(pool), [], 'migrations are applied once');
  const app = createApp({ pool, jwtSecret, corsOrigins: ['https://anuragtyagi-si.github.io'], authRateLimit: false });
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

test('sign-up creates a creator, stores a hash, and returns a usable token', async () => {
  const { status, body } = await call('POST', '/auth/signup', { body: account });
  assert.equal(status, 201);
  assert.equal(body.user.email, account.email);
  assert.equal(body.user.role, 'creator');
  assert.equal(body.user.password_hash, undefined);
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [account.email]);
  assert.match(rows[0].password_hash, /^\$2[aby]\$12\$/);
  const me = await call('GET', '/auth/me', { token: body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.id, body.user.id);
});

test('sign-up rejects a duplicate email regardless of case', async () => {
  const { status } = await call('POST', '/auth/signup', { body: { ...account, email: 'MAYA@example.com' } });
  assert.equal(status, 409);
});

test('login accepts the right password and rejects wrong or unknown credentials', async () => {
  const ok = await call('POST', '/auth/login', { body: { email: 'Maya@Example.com', password: account.password } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
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
  const other = (await call('POST', '/auth/signup', { body: { name: 'Leo', email: 'leo@example.com', password: 'another-pass-1' } })).body;
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

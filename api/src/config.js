import { randomBytes } from 'node:crypto';

export function loadConfig(env = process.env) {
  let jwtSecret = env.JWT_SECRET || '';
  if (!jwtSecret && env.NODE_ENV !== 'production') {
    // Local convenience: a per-process key, so logins end when the API restarts.
    jwtSecret = randomBytes(32).toString('hex');
    console.warn('JWT_SECRET is not set: using a temporary key, logins will not survive a restart.');
  }
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters');
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  return {
    port: Number(env.PORT) || 4000,
    databaseUrl: env.DATABASE_URL,
    databaseSsl: env.DATABASE_SSL === 'no-verify' ? 'no-verify' : env.DATABASE_SSL === 'true',
    jwtSecret,
    // Number of reverse proxies in front of the API; 0 when it is reached directly.
    trustProxy: Number(env.TRUST_PROXY) || false,
    corsOrigins: (env.CORS_ORIGINS || 'https://anuragtyagi-si.github.io,http://localhost:5173')
      .split(',').map(origin => origin.trim()).filter(Boolean),
  };
}

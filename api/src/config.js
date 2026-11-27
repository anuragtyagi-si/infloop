export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const jwtSecret = env.JWT_SECRET || (production ? '' : 'dev-only-secret-change-me-dev-only-secret');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters');
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  return {
    port: Number(env.PORT) || 4000,
    databaseUrl: env.DATABASE_URL,
    databaseSsl: env.DATABASE_SSL === 'true',
    jwtSecret,
    // Number of reverse proxies in front of the API; 0 when it is reached directly.
    trustProxy: Number(env.TRUST_PROXY) || false,
    corsOrigins: (env.CORS_ORIGINS || 'https://anuragtyagi-si.github.io,http://localhost:5173')
      .split(',').map(origin => origin.trim()).filter(Boolean),
  };
}

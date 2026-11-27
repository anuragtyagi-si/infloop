import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool, migrate } from './db.js';

const config = loadConfig();
const pool = createPool(config);
const ran = await migrate(pool);
if (ran.length) console.log(`Applied migrations: ${ran.join(', ')}`);

const server = createApp({ pool, jwtSecret: config.jwtSecret, corsOrigins: config.corsOrigins, trustProxy: config.trustProxy })
  .listen(config.port, () => console.log(`infloop API listening on :${config.port}`));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => pool.end().then(() => process.exit(0))));
}

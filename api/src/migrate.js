import { loadConfig } from './config.js';
import { createPool, migrate } from './db.js';

const pool = createPool(loadConfig());
try {
  const ran = await migrate(pool);
  console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Database is up to date');
} finally {
  await pool.end();
}

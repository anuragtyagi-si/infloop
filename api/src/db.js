import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const migrationsDir = fileURLToPath(new URL('../migrations/', import.meta.url));

export function createPool({ databaseUrl, databaseSsl }) {
  const pool = new pg.Pool({ connectionString: databaseUrl, ssl: databaseSsl ? { rejectUnauthorized: databaseSsl !== 'no-verify' } : undefined });
  // Without a listener, a dropped idle connection would crash the process.
  pool.on('error', error => console.error('Idle PostgreSQL connection failed:', error.message));
  return pool;
}

// Applies each migrations/*.sql file once, in name order, inside a transaction.
export async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(727001)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map(row => row.name));
    const files = (await readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort();
    const ran = [];
    for (const name of files) {
      if (applied.has(name)) continue;
      const sql = await readFile(migrationsDir + name, 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${name} failed: ${error.message}`, { cause: error });
      }
      ran.push(name);
    }
    return ran;
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => {});
    client.release();
  }
}

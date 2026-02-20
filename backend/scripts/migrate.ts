import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const stage = process.env.DB_STAGE ?? 'dev';
const PG_CONNECTION_STRING =
  stage === 'prod' ? process.env.PG_CONNECTION_STRING_PROD : process.env.PG_CONNECTION_STRING_DEV;

if (!PG_CONNECTION_STRING) {
  throw new Error(`PG_CONNECTION_STRING_${stage.toUpperCase()} is not defined in .env`);
}

const sql = neon(PG_CONNECTION_STRING);
const db = drizzle(sql);

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

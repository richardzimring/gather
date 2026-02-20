import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const stage = process.env.DB_STAGE ?? 'dev';
const url =
  stage === 'prod' ? process.env.PG_CONNECTION_STRING_PROD : process.env.PG_CONNECTION_STRING_DEV;

if (!url) {
  throw new Error(`PG_CONNECTION_STRING_${stage.toUpperCase()} is not defined in .env`);
}

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: { url },
});

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { PG_CONNECTION_STRING } from './src/constants';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: PG_CONNECTION_STRING,
  },
});

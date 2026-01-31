import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { PG_CONNECTION_STRING } from '../constants';

const sql = neon(PG_CONNECTION_STRING);
export const db = drizzle(sql, { schema });

// Re-export schema for convenience
export * from './schema';

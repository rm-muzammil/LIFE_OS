import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

neonConfig.fetchFunction = (url: string, init: RequestInit) =>
  fetch(url, { ...init, cache: 'no-store' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to your .env.local file.');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
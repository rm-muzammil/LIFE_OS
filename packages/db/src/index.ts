import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export * from './schema';

neonConfig.fetchFunction = (url: string, init: RequestInit) =>
  fetch(url, { ...init, cache: 'no-store' });

// Provide a fallback connection string for build-time static evaluation
const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://placeholder:placeholder@localhost:5432/placeholder';

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
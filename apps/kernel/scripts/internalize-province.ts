import 'dotenv/config';
import { db } from '@/db';
import { provinces } from '@/db/schema';
import { eq } from 'drizzle-orm';

const [rawSlug, ...args] = process.argv.slice(2);
const allowedArgs = new Set(['--apply']);

if (!rawSlug || args.some((arg) => !allowedArgs.has(arg))) {
  console.error('Usage: internalize-province.ts <slug> [--apply]');
  process.exit(1);
}

const slug = rawSlug.trim().toLowerCase();
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error('Slug must contain only lowercase letters, numbers, and hyphens.');
  process.exit(1);
}

async function main() {
  const rows = await db
    .select({ userId: provinces.userId, url: provinces.url })
    .from(provinces)
    .where(eq(provinces.slug, slug));
  const targetUrl = `/${slug}`;

  console.log(`Found ${rows.length} '${slug}' province row(s); target URL: ${targetUrl}.`);

  if (!args.includes('--apply')) {
    console.log('Dry run only. Re-run with --apply to update all matching users.');
    return;
  }

  const updated = await db
    .update(provinces)
    .set({ url: targetUrl })
    .where(eq(provinces.slug, slug))
    .returning({ userId: provinces.userId });
  console.log(`Updated ${updated.length} '${slug}' province row(s).`);
}

main().catch((error: unknown) => {
  console.error('Failed to internalize province URL:', error);
  process.exitCode = 1;
});

import { db } from '@/db';
import { provinces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generatePullSecret } from '@/lib/auth';

export const DEFAULT_PROVINCES = [
  {
    name: 'Faith',
    slug: 'faith',
    url: 'https://faithtracker.vercel.app',
    weight: 0.25,
  },
  {
    name: 'Personal',
    slug: 'personal',
    url: 'https://personal-blush-zeta.vercel.app',
    weight: 0.2,
  },
  {
    name: 'Wealth',
    slug: 'wealth',
    url: 'https://wealth-app-eta.vercel.app',
    weight: 0.15,
  },
  {
    name: 'Roadmap',
    slug: 'roadmap',
    url: 'https://life-os-chi-ecru.vercel.app',
    weight: 0.15,
  },
  {
    name: 'Relationships',
    slug: 'relationships',
    url: 'https://your-relationships-app.vercel.app',
    weight: 0.1,
  },
  {
    name: 'Work',
    slug: 'work',
    url: 'https://work-app-azure.vercel.app',
    weight: 0.1,
  },
] as const;

function buildRows(userId: string) {
  return DEFAULT_PROVINCES.map((p) => ({
    userId,
    name: p.name,
    slug: p.slug,
    url: p.url,
    weight: p.weight,
    active: true,
    // Push auth no longer checks this column — it now checks the single
    // PROVINCE_SHARED_API_KEY env var (see /api/provinces/report). Kept
    // as a literal marker rather than dropping the column, since it's
    // NOT NULL and still populated by the older /api/provinces/register
    // path for anyone adding a custom 7th province by hand.
    apiKeyHash: 'shared',
    // Pull auth (SK -> province app) is unchanged and still per-user —
    // this keeps working exactly as before.
    pullSecret: generatePullSecret(),
  }));
}

/**
 * Called from the signIn callback on every sign-in. Only creates the 6
 * default provinces the first time a user is seen (no provinces row yet) —
 * a no-op for everyone who already has provinces, whether auto- or
 * manually-registered. Never throws — a transient DB hiccup here should
 * never block someone from actually signing in; they can always hit
 * "Reset to defaults" on /provinces afterward.
 */
export async function ensureDefaultProvinces(userId: string): Promise<void> {
  try {
    const existing = await db
      .select({ id: provinces.id })
      .from(provinces)
      .where(eq(provinces.userId, userId))
      .limit(1);

    if (existing.length > 0) return;

    await db.insert(provinces).values(buildRows(userId));
  } catch (err) {
    // Swallow — see doc comment above. A duplicate-key error here most
    // likely means a concurrent sign-in already provisioned this user.
    console.error('ensureDefaultProvinces failed for', userId, err);
  }
}

/**
 * Called from the "Reset to defaults" button — deletes every province this
 * user currently has (including any custom ones they registered by hand)
 * and recreates exactly the 6 defaults. Historical province_daily_snapshots
 * rows are keyed by (userId, date, slug), not province id, so past life-score
 * history for faith/personal/wealth/roadmap/relationships/work survives a
 * reset untouched; only a custom, non-default slug's history would become
 * orphaned (still in the DB, just no longer linked to a visible province row).
 */
export async function resetToDefaultProvinces(userId: string): Promise<void> {
  await db.delete(provinces).where(eq(provinces.userId, userId));
  await db.insert(provinces).values(buildRows(userId));
}

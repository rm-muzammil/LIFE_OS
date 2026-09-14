/**
 * Seeds the 6 known provinces (Faith, Personal, Wealth, Roadmap, Relationships, Work)
 * by calling the /api/provinces/register endpoint of a running instance.
 *
 * /api/provinces/register now requires a signed-in session (multi-user auth) — this
 * script can no longer register provinces anonymously. Sign in to the app in your
 * browser first, copy the `next-auth.session-token` (or
 * `__Secure-next-auth.session-token` in production) cookie value from DevTools >
 * Application > Cookies, and pass it as SESSION_COOKIE.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 \
 *   SESSION_COOKIE="next-auth.session-token=..." \
 *   npx tsx scripts/seed-provinces.ts
 *
 * IMPORTANT: This prints raw apiKey + pullSecret ONCE per province — save them
 * immediately into each province app's environment variables.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SESSION_COOKIE = process.env.SESSION_COOKIE;

if (!SESSION_COOKIE) {
  console.error(
    'SESSION_COOKIE is required — sign in at ' +
      BASE_URL +
      ' and copy your next-auth session cookie (see comment at the top of this file).'
  );
  process.exit(1);
}

const SEED = [
  { name: 'Faith', slug: 'faith', url: 'https://faithtracker.vercel.app', weight: 0.25 },
  { name: 'Personal', slug: 'personal', url: 'https://personal-app.vercel.app', weight: 0.2 },
  { name: 'Wealth', slug: 'wealth', url: 'https://wealth-app-eta.vercel.app', weight: 0.15 },
  { name: 'Roadmap', slug: 'roadmap', url: 'https://life-os-chi-ecru.vercel.app', weight: 0.15 },
  { name: 'Relationships', slug: 'relationships', url: 'https://REPLACE-ME.vercel.app', weight: 0.1 },
  { name: 'Work', slug: 'work', url: 'https://REPLACE-ME.vercel.app', weight: 0.1 },
];

async function main() {
  for (const province of SEED) {
    const res = await fetch(`${BASE_URL}/api/provinces/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: SESSION_COOKIE! },
      body: JSON.stringify(province),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`✗ ${province.slug}: ${data.error}`);
      continue;
    }
    console.log(`\n✓ ${province.name} (${province.slug}) registered`);
    console.log(`  X-Api-Key (push):      ${data.rawApiKey}`);
    console.log(`  Pull Secret (Bearer):  ${data.pullSecret}`);
  }
  console.log('\nSave these credentials into each province app now — they will not be shown again.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

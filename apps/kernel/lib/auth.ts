import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth-options';

// ─────────────────────────────────────────────────────────────
// Session-based auth (Google OAuth via next-auth) — used to scope every
// user's data by userId.
// ─────────────────────────────────────────────────────────────

/**
 * For Server Components / pages only — redirects to the sign-in page if
 * there's no session. Do NOT use in API routes (redirect() there returns
 * an HTML redirect, not a JSON 401); use getApiUserId() instead.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/auth/signin');
  return session;
}

/** For Server Components / pages only. See requireAuth() note above. */
export async function getUserId(): Promise<string> {
  const session = await requireAuth();
  return session.user.id;
}

/**
 * For API routes — returns null instead of redirecting so the caller can
 * return a proper `{ error: 'Unauthorized' }` 401 JSON response.
 *
 * Checks two things, in order:
 *  1. A next-auth session cookie (browser / web app requests).
 *  2. An app-issued mobile JWT sent as `Authorization: Bearer <token>` (the
 *     Kotlin/Android app — see /api/mobile-auth for how it gets this token).
 *     The mobile token's `sub` claim is the same Google `sub` used
 *     everywhere else as userId, so both paths resolve to the exact same
 *     identity and every existing route works for both clients unchanged.
 */
export async function getApiUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  const authHeader = headers().get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as { sub?: string };
      if (decoded.sub) return decoded.sub;
    } catch {
      // Invalid, expired, or forged mobile token — fall through to null.
    }
  }

  return null;
}

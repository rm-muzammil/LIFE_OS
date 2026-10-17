import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

// Exchanges a Google ID token (obtained natively on Android via Credential
// Manager / Google Sign-In) for a long-lived app JWT. The Android app sends
// this JWT as `Authorization: Bearer <token>` on every subsequent API call —
// see lib/auth.ts:getApiUserId, which accepts either this or a next-auth
// session cookie.
//
// Verification is done via Google's tokeninfo endpoint rather than the
// google-auth-library's JWKS verification — simpler to operate for this
// scale (a handful of users), at the cost of one extra network round-trip
// per sign-in (not per API call — the app token is cached client-side).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const idToken = body?.idToken;
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    const verifyRes = await fetch(
      `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`,
      { cache: 'no-store' }
    );
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Invalid Google ID token' }, { status: 401 });
    }
    const payload = await verifyRes.json();

    // Must match one of the OAuth client IDs this deployment trusts.
    // GOOGLE_CLIENT_ID is the existing "Web application" client (next-auth).
    // GOOGLE_ANDROID_CLIENT_ID is a separate "Android" OAuth client you need
    // to create in Google Cloud Console — see the Kotlin-side setup notes.
    const allowedAudiences = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID].filter(
      Boolean
    );
    if (!payload.aud || !allowedAudiences.includes(payload.aud)) {
      return NextResponse.json({ error: 'Token audience not recognized' }, { status: 401 });
    }
    if (!payload.sub) {
      return NextResponse.json({ error: 'Token missing sub claim' }, { status: 401 });
    }
    if (payload.email_verified === 'false') {
      return NextResponse.json({ error: 'Email not verified' }, { status: 401 });
    }

    // This sub is the exact same value next-auth exposes as session.user.id
    // on the web — same Google account, same identity, same data.
    const appToken = jwt.sign({ sub: payload.sub }, process.env.NEXTAUTH_SECRET!, {
      expiresIn: '30d',
    });

    return NextResponse.json({ token: appToken, userId: payload.sub, expiresIn: '30d' });
  } catch (err) {
    console.error('mobile-auth error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

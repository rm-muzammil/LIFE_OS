import { withAuth } from 'next-auth/middleware';

// Every page in this app fetches its data client-side from API routes that
// already enforce their own session check (see lib/auth.ts:getApiUserId).
// Without this middleware, though, a signed-out visitor would still see the
// page shells themselves (nav, empty states) before those fetches 401 —
// this redirects them to /auth/signin up front instead. API routes are
// intentionally left out of the matcher below since some of them (province
// report/push, cron) authenticate differently and must not be redirected.
export default withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

export const config = {
  matcher: [
    /*
     * Match all page routes except:
     * - /auth/signin (the sign-in page itself)
     * - /api/* (routes handle their own auth)
     * - /_next/* (Next.js internals)
     * - static files (favicon, manifest, service worker, etc.)
     */
    '/((?!auth/signin|offline|api|_next/static|_next/image|favicon.ico|apple-touch-icon.png|sw.js|workbox-.*\\.js|fallback-.*\\.js).*)',
  ],
};

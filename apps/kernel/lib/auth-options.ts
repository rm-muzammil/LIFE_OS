import type { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { ensureDefaultProvinces } from '@/lib/default-provinces';

// No allowlist — any Google account can sign in. Data is fully isolated
// per-user via userId columns (see db/schema.ts), so an open sign-up is safe.
//
// Lives in its own module (not app/api/auth/[...nextauth]/route.ts) because
// Next.js 14.2's typed routes reject any export from a route.ts file besides
// the recognized ones (GET, POST, dynamic, etc.) — exporting authOptions
// there fails `next build`.
export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // user.id here is the Google `sub` (next-auth's built-in Google
      // provider maps profile.sub -> id), matching what the session
      // callback below later exposes as session.user.id.
      if (user.id) {
        await ensureDefaultProvinces(user.id);
      }
      return true;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

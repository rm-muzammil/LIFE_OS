'use client';

import { signIn } from 'next-auth/react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10 text-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">
            Self-<span className="text-brand-400">Khilafah</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-2">
            Build wealth → Politics → Real Khilafah.
            <br />
            Not guaranteed. Committed regardless.
          </p>
        </div>

        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 rounded-xl bg-zinc-100 text-zinc-900 font-medium px-5 py-3 hover:bg-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>

        <p className="text-xs leading-relaxed text-zinc-700">
          "And that man will only have what he strives for."
          <br />
          <span className="text-zinc-800">— An-Najm 53:39</span>
        </p>
      </div>
    </div>
  );
}

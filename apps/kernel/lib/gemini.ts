// Gemini 2.5 Flash — 3-key fallback chain.
// Plain fetch (no SDK) to match the fetch-based pattern already used
// for province pulls in app/api/cron/pull-provinces/route.ts.

import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const MODEL = 'gemini-flash-latest';
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

function getEnvKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => Boolean(k && k.trim()));
}

/**
 * Loads a user's own Gemini keys from user_settings (Settings page). Returns
 * an empty array if the user hasn't configured any — callers pass that
 * straight into callGemini's `apiKeys` option, which falls back to the
 * shared env vars in that case.
 */
export async function getUserGeminiKeys(userId: string): Promise<string[]> {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (!row) return [];
  return [row.geminiKey1, row.geminiKey2, row.geminiKey3].filter(
    (k): k is string => Boolean(k && k.trim())
  );
}

export class GeminiError extends Error {
  constructor(message: string, public readonly attempts: string[]) {
    super(message);
    this.name = 'GeminiError';
  }
}

/**
 * Calls Gemini with a plain-text prompt, trying each configured API key in
 * order until one succeeds. Throws GeminiError if all keys fail or none are
 * configured. Callers that need "never crash the schedule" behavior should
 * catch this and store an empty tasks array + generationError instead.
 *
 * Pass `opts.apiKeys` to use a specific user's Gemini keys (from
 * user_settings) instead of the shared env vars — falls back to env vars
 * if the array is empty/omitted, so users who haven't set their own keys
 * still work off the shared pool.
 */
export async function callGemini(
  prompt: string,
  opts?: { temperature?: number; apiKeys?: string[] }
): Promise<string> {
  const keys = opts?.apiKeys && opts.apiKeys.length > 0 ? opts.apiKeys : getEnvKeys();
  if (keys.length === 0) {
    throw new GeminiError('No Gemini API keys configured (user_settings or GEMINI_API_KEY_1/2/3)', []);
  }

  const attempts: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const res = await fetch(ENDPOINT(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: opts?.temperature ?? 0.4,
          },
        }),
        cache: 'no-store',
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        attempts.push(`key${i + 1}: HTTP ${res.status} ${body.slice(0, 200)}`);
        continue;
      }

      const data = await res.json();
      const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        attempts.push(`key${i + 1}: empty response`);
        continue;
      }

      return text;
    } catch (err) {
      attempts.push(`key${i + 1}: ${String(err)}`);
    }
  }

  throw new GeminiError('All Gemini keys failed', attempts);
}

/**
 * Strips markdown code fences if the model ignored the "no markdown" instruction,
 * then parses as JSON. Throws if the result isn't valid JSON.
 */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

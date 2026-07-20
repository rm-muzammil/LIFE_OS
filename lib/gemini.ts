// Gemini 2.5 Flash — 3-key fallback chain.
// Plain fetch (no SDK) to match the fetch-based pattern already used
// for province pulls in app/api/cron/pull-provinces/route.ts.

const MODEL = 'gemini-flash-latest';
const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

function getKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => Boolean(k && k.trim()));
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
 */
export async function callGemini(prompt: string, opts?: { temperature?: number }): Promise<string> {
  const keys = getKeys();
  if (keys.length === 0) {
    throw new GeminiError('No GEMINI_API_KEY_1/2/3 configured', []);
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

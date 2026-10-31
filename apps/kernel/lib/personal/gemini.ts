import { TRAINING_DAYS } from '@/lib/personal/content';
import type { DayPlan } from '@/lib/personal/types';

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-8b'];

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
      }
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('candidates' in data)) return null;
    const candidates = data.candidates;
    if (!Array.isArray(candidates)) return null;
    const content = candidates[0]?.content;
    if (!content || typeof content !== 'object' || !('parts' in content)) return null;
    const parts = content.parts;
    if (!Array.isArray(parts)) return null;
    const text = parts[0]?.text;
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

export async function generateWeeklyWorkouts(
  weekDates: { day: string; date: string }[],
  lastWeekEffort: number[],
  lastWeekSetsCompleted: number[],
  apiKeys: string[]
): Promise<DayPlan[]> {
  void lastWeekSetsCompleted;
  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured in your Kernel settings.');
  }

  const avgEffort =
    lastWeekEffort.length > 0
      ? lastWeekEffort.reduce((sum, value) => sum + value, 0) / lastWeekEffort.length
      : 3;
  const progressNote =
    avgEffort >= 4
      ? 'Last week effort was high (≥4/5) — increase reps or sets for progressive overload.'
      : 'Maintain current volume and focus on form.';

  const prompt = `You are a strength and conditioning coach for a young male athlete (BMI 16.1, severely underweight, building muscle + self-defense fitness). Equipment: bodyweight only. Goal: functional athleticism, hypertrophy, self-defense conditioning (MMA, BJJ, Boxing, Muay Thai).

Training style: combine classic bodyweight strength work with martial arts conditioning — shadow boxing, striking combos, sprawls, hip escapes, neck bridges, core for grappling, kick drills, movement drills.

${progressNote}

Generate exactly ${weekDates.length} workout plans for these training days:
${weekDates.map((day, index) => `${index + 1}. ${day.day} (${day.date})`).join('\n')}

Each workout must have:
- "day": lowercase day name exactly as given above
- "date": YYYY-MM-DD exactly as given above
- "focus": short label e.g. "Push + Boxing", "Legs + Muay Thai", "Pull + BJJ Mobility"
- "exercises": array of exactly 7 exercises, each with "name" (string), "sets" (integer), "reps" (string), "notes" (string, max 10 words)

Return a JSON array of ${weekDates.length} objects. No markdown, no extra text, only the JSON array.`;

  let raw: string | null = null;
  for (const key of apiKeys) {
    for (const model of MODELS) {
      raw = await callGemini(key, model, prompt);
      if (raw) break;
    }
    if (raw) break;
  }
  if (!raw) {
    throw new Error('All configured Gemini keys and models failed; check connectivity and rate limits.');
  }

  const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start === -1 || end === -1) {
    throw new Error(`No JSON array found in response. Raw: ${clean.slice(0, 200)}`);
  }
  return JSON.parse(clean.slice(start, end + 1)) as DayPlan[];
}

export function getTrainingDaysForWeek(weekStart: string): { day: string; date: string }[] {
  const base = new Date(`${weekStart}T00:00:00`);
  return TRAINING_DAYS.map(({ day, offset }) => {
    const date = new Date(base);
    date.setDate(date.getDate() + offset);
    return { day, date: date.toLocaleDateString('en-CA') };
  });
}

export function getMondayOfWeek(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date.toLocaleDateString('en-CA');
}

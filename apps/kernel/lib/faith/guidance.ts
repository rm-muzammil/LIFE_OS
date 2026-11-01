import { callGemini } from '@/lib/gemini';
import { getIslamicContext } from '@/lib/faith/hijri';
import type { DailyGuidance, HijriDate } from '@/lib/faith/types';
import type { FaithDailyLog } from '@/db/schema';

const PRACTICE_FIELDS = [
  ['Fajr prayer', 'fajr'],
  ['Dhuhr prayer', 'dhuhr'],
  ['Asr prayer', 'asr'],
  ['Maghrib prayer', 'maghrib'],
  ['Isha prayer', 'isha'],
  ['Morning adhkar', 'morningAdhkar'],
  ['Evening adhkar', 'eveningAdhkar'],
  ['Tafseer', 'tafseerDone'],
  ['Verse memorization', 'verseDone'],
  ['Surah Al-Mulk', 'surahMulk'],
] as const;

function isDailyGuidance(value: unknown): value is Omit<DailyGuidance, 'generatedAt'> {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const verse = record.verse;
  const hadith = record.hadith;
  return (
    typeof record.greeting === 'string' &&
    typeof record.focusToday === 'string' &&
    (record.weaknessAlert === null || typeof record.weaknessAlert === 'string') &&
    typeof verse === 'object' &&
    verse !== null &&
    typeof (verse as Record<string, unknown>).arabic === 'string' &&
    typeof (verse as Record<string, unknown>).translation === 'string' &&
    typeof (verse as Record<string, unknown>).reference === 'string' &&
    typeof hadith === 'object' &&
    hadith !== null &&
    typeof (hadith as Record<string, unknown>).text === 'string' &&
    typeof (hadith as Record<string, unknown>).source === 'string' &&
    (record.specialDay === null || typeof record.specialDay === 'string') &&
    Array.isArray(record.actionItems) &&
    record.actionItems.every((item) => typeof item === 'string')
  );
}

function parseGuidance(raw: string): Omit<DailyGuidance, 'generatedAt'> | null {
  const clean = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  const json = clean
    .slice(start, end + 1)
    .replace(/,\s*([}\]])/g, '$1');
  try {
    const parsed: unknown = JSON.parse(json);
    return isDailyGuidance(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function generateDailyGuidance(
  recentLogs: FaithDailyLog[],
  hijri: HijriDate,
  apiKeys: string[]
): Promise<DailyGuidance | null> {
  const missedPractices = PRACTICE_FIELDS.map(([label, field]) => {
    const missed = recentLogs.filter((log) => !log[field]).length;
    return {
      label,
      missed,
      weakness: missed >= Math.ceil(recentLogs.length / 2),
    };
  });
  const averageScore =
    recentLogs.length === 0
      ? 0
      : Math.round(
          recentLogs.reduce((total, log) => total + log.finalScore, 0) / recentLogs.length
        );
  const contexts = getIslamicContext(hijri);
  const prompt = `You are a compassionate Islamic daily-guidance assistant. Give concise, practical and encouraging guidance without shaming.

Hijri date: ${hijri.formatted} (${hijri.dayName})
Islamic context today: ${contexts.length > 0 ? contexts.join('; ') : 'None'}
Recent logged days: ${recentLogs.length}
Average Faith score: ${averageScore}
Practice completion summary (missed days in the recent logs; weakness means at least half):
${missedPractices.map(({ label, missed, weakness }) => `- ${label}: missed ${missed}; weakness=${weakness}`).join('\n')}

Return one JSON object with exactly these fields:
{
  "greeting": "short greeting",
  "focusToday": "one practical focus",
  "weaknessAlert": "gentle note about a repeated gap, or null",
  "verse": {"arabic": "Arabic verse text", "translation": "English meaning", "reference": "surah and ayah"},
  "hadith": {"text": "short hadith", "source": "reliable source reference"},
  "specialDay": "relevant note, or null",
  "actionItems": ["short actionable item"],
  "generatedAt": "leave as an empty string; the server sets this"
}
Use the listed practice summary and Islamic context; do not invent a special day when context is None. Return JSON only, with no markdown.`;

  try {
    const response = await callGemini(prompt, { temperature: 0.4, apiKeys });
    const parsed = parseGuidance(response);
    return parsed ? { ...parsed, generatedAt: new Date().toISOString() } : null;
  } catch {
    return null;
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DailyLog } from "@/db/schema";
import type { HijriDate } from "./hijri";
import { getIslamicContext } from "./hijri";

export interface DailyGuidance {
  greeting: string;
  focusToday: string;
  weaknessAlert: string | null;
  verse: { arabic: string; translation: string; reference: string };
  hadith: { text: string; source: string };
  specialDay: string | null;
  actionItems: string[];
  generatedAt: string;
}

function buildPrompt(
  recentLogs: Partial<DailyLog>[],
  hijri: HijriDate,
  islamicContexts: string[]
): string {
  const n = recentLogs.length;
  const patterns = {
    fajrMissed:         recentLogs.filter((l) => !l.fajr).length,
    ishaMissed:         recentLogs.filter((l) => !l.isha).length,
    dhuhrMissed:        recentLogs.filter((l) => !l.dhuhr).length,
    asrMissed:          recentLogs.filter((l) => !l.asr).length,
    maghribMissed:      recentLogs.filter((l) => !l.maghrib).length,
    morningAdhkarMissed:recentLogs.filter((l) => !l.morningAdhkar).length,
    eveningAdhkarMissed:recentLogs.filter((l) => !l.eveningAdhkar).length,
    tafseerMissed:      recentLogs.filter((l) => !l.tafseerDone).length,
    verseMissed:        recentLogs.filter((l) => !l.verseDone).length,
    mulkMissed:         recentLogs.filter((l) => !l.surahMulk).length,
    avgScore: n > 0
      ? Math.round(recentLogs.reduce((s, l) => s + (l.finalScore ?? 0), 0) / n)
      : 0,
  };

  const weaknesses = Object.entries(patterns)
    .filter(([key, val]) => key !== "avgScore" && typeof val === "number" && val >= Math.ceil(n * 0.5))
    .map(([key, val]) => `${key}: missed ${val}/${n} days`);

  return `You are a knowledgeable Islamic scholar and personal faith coach.

TODAY: ${hijri.formatted}, ${hijri.dayName}
SPECIAL OCCASIONS: ${islamicContexts.length > 0 ? islamicContexts.join("; ") : "None"}
LAST ${n} DAYS: avg score ${patterns.avgScore}/100
WEAKNESSES: ${weaknesses.length > 0 ? weaknesses.join(", ") : "none"}
DETAIL: Fajr missed ${patterns.fajrMissed}/${n}, Isha ${patterns.ishaMissed}/${n}, Morning adhkar ${patterns.morningAdhkarMissed}/${n}, Evening adhkar ${patterns.eveningAdhkarMissed}/${n}, Tafseer ${patterns.tafseerMissed}/${n}, Verse ${patterns.verseMissed}/${n}, Surah Mulk ${patterns.mulkMissed}/${n}

CRITICAL RULES FOR YOUR RESPONSE:
1. Respond with ONLY a JSON object. No markdown. No backticks. No explanation.
2. Start with { and end with }
3. Do NOT use apostrophes (') anywhere in string values. Use "you" not "you're", "do not" not "don't", "it is" not "it's".
4. Do NOT use double quotes inside string values. Rephrase instead.
5. Keep all string values on a single line with no newlines inside them.

JSON structure to fill:
{
  "greeting": "warm Islamic greeting for today 1-2 sentences no apostrophes",
  "focusToday": "most important focus based on date and patterns 2-3 sentences no apostrophes",
  "weaknessAlert": "compassionate warning about the biggest weakness with a verse or hadith, or null if no major weakness",
  "verse": {
    "arabic": "Arabic text of a relevant verse",
    "translation": "English translation no apostrophes",
    "reference": "Surah Name chapter:verse"
  },
  "hadith": {
    "text": "hadith text no apostrophes",
    "source": "e.g. Sahih Bukhari"
  },
  "specialDay": "Islamic significance of today or null",
  "actionItems": ["action 1", "action 2", "action 3"]
}`;
}

/**
 * Attempt to repair common JSON issues from LLM output:
 * - Unescaped apostrophes inside string values
 * - Trailing commas
 */
function repairJson(raw: string): string {
  // Extract the outermost { ... }
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON object found");
  let s = raw.slice(first, last + 1);

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");

  // Replace unescaped apostrophes inside JSON string values
  // Strategy: parse character by character tracking if we're inside a string
  let result = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }
    // Replace unescaped apostrophe inside a string with a right single quote (safe in JSON)
    if (inString && ch === "'") {
      result += "\u2019"; // right single quotation mark — valid in JSON strings
      continue;
    }
    result += ch;
  }

  return result;
}

export async function generateDailyGuidance(
  recentLogs: Partial<DailyLog>[],
  hijri: HijriDate,
  apiKey: string
): Promise<DailyGuidance | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.4, // lower = more predictable JSON structure
        maxOutputTokens: 2048,
      },
    });

    const islamicContexts = getIslamicContext(hijri);
    const prompt = buildPrompt(recentLogs, hijri, islamicContexts);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("[guidance] Raw (first 200):", text.slice(0, 200));

    // Strip markdown fences
    const stripped = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    // Repair and parse
    const repaired = repairJson(stripped);
    const parsed = JSON.parse(repaired) as DailyGuidance;
    parsed.generatedAt = new Date().toISOString();
    return parsed;
  } catch (err) {
    console.error("[guidance] Gemini error:", err);
    return null;
  }
}
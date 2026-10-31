const JUZ_30_SURAH_LENGTHS = [
  [114, 6],
  [113, 5],
  [112, 4],
  [111, 5],
  [110, 3],
  [109, 6],
  [108, 3],
  [107, 7],
  [106, 4],
  [105, 5],
  [104, 9],
  [103, 3],
  [102, 8],
  [101, 11],
  [100, 11],
  [99, 8],
  [98, 8],
  [97, 5],
  [96, 19],
  [95, 8],
  [94, 8],
  [93, 11],
  [92, 21],
  [91, 15],
  [90, 20],
  [89, 30],
  [88, 26],
  [87, 19],
  [86, 17],
  [85, 22],
  [84, 25],
  [83, 36],
  [82, 19],
  [81, 29],
  [80, 42],
  [79, 46],
  [78, 40],
] as const;

export interface VerseRef {
  surahNumber: number;
  ayahNumber: number;
}

export interface VerseData extends VerseRef {
  arabic: string;
  translation: string;
  surahName: string;
  globalIndex: number;
}

export const JUZ30_SEQUENCE: VerseRef[] = JUZ_30_SURAH_LENGTHS.flatMap(
  ([surahNumber, ayahCount]) =>
    Array.from({ length: ayahCount }, (_, index) => ({
      surahNumber,
      ayahNumber: index + 1,
    }))
);

export const TOTAL_JUZ30_VERSES = JUZ30_SEQUENCE.length;

interface QuranApiVerse {
  text?: unknown;
  surah?: {
    englishName?: unknown;
  };
}

function verseText(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) return null;
  const data = payload.data as QuranApiVerse | null;
  return typeof data?.text === 'string' ? data.text : null;
}

function verseName(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) return null;
  const data = payload.data as QuranApiVerse | null;
  return typeof data?.surah?.englishName === 'string' ? data.surah.englishName : null;
}

export async function fetchVerse(globalIndex: number): Promise<VerseData | null> {
  const reference = JUZ30_SEQUENCE[globalIndex];
  if (!reference) return null;

  const path = `${reference.surahNumber}:${reference.ayahNumber}`;
  try {
    const [arabicResponse, translationResponse] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/ayah/${path}/ar.alafasy`, { cache: 'no-store' }),
      fetch(`https://api.alquran.cloud/v1/ayah/${path}/en.sahih`, { cache: 'no-store' }),
    ]);
    if (!arabicResponse.ok || !translationResponse.ok) return null;

    const [arabicPayload, translationPayload] = await Promise.all([
      arabicResponse.json() as Promise<unknown>,
      translationResponse.json() as Promise<unknown>,
    ]);
    const arabic = verseText(arabicPayload);
    const translation = verseText(translationPayload);
    const surahName = verseName(translationPayload);
    if (!arabic || !translation || !surahName) return null;

    return {
      ...reference,
      arabic,
      translation,
      surahName,
      globalIndex,
    };
  } catch {
    return null;
  }
}

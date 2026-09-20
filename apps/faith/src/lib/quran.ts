// Juz 30 — An-Nas back to An-Naba (back→front order)
// Each entry: [surahNumber, ayahCount]
export const JUZ30_SURAHS: Array<{ surah: number; name: string; ayahs: number }> =
  [
    { surah: 114, name: "An-Nas", ayahs: 6 },
    { surah: 113, name: "Al-Falaq", ayahs: 5 },
    { surah: 112, name: "Al-Ikhlas", ayahs: 4 },
    { surah: 111, name: "Al-Masad", ayahs: 5 },
    { surah: 110, name: "An-Nasr", ayahs: 3 },
    { surah: 109, name: "Al-Kafirun", ayahs: 6 },
    { surah: 108, name: "Al-Kawthar", ayahs: 3 },
    { surah: 107, name: "Al-Ma'un", ayahs: 7 },
    { surah: 106, name: "Quraysh", ayahs: 4 },
    { surah: 105, name: "Al-Fil", ayahs: 5 },
    { surah: 104, name: "Al-Humazah", ayahs: 9 },
    { surah: 103, name: "Al-Asr", ayahs: 3 },
    { surah: 102, name: "At-Takathur", ayahs: 8 },
    { surah: 101, name: "Al-Qari'ah", ayahs: 11 },
    { surah: 100, name: "Al-Adiyat", ayahs: 11 },
    { surah: 99, name: "Az-Zalzalah", ayahs: 8 },
    { surah: 98, name: "Al-Bayyinah", ayahs: 8 },
    { surah: 97, name: "Al-Qadr", ayahs: 5 },
    { surah: 96, name: "Al-Alaq", ayahs: 19 },
    { surah: 95, name: "At-Tin", ayahs: 8 },
    { surah: 94, name: "Ash-Sharh", ayahs: 8 },
    { surah: 93, name: "Ad-Duha", ayahs: 11 },
    { surah: 92, name: "Al-Layl", ayahs: 21 },
    { surah: 91, name: "Ash-Shams", ayahs: 15 },
    { surah: 90, name: "Al-Balad", ayahs: 20 },
    { surah: 89, name: "Al-Fajr", ayahs: 30 },
    { surah: 88, name: "Al-Ghashiyah", ayahs: 26 },
    { surah: 87, name: "Al-A'la", ayahs: 19 },
    { surah: 86, name: "At-Tariq", ayahs: 17 },
    { surah: 85, name: "Al-Buruj", ayahs: 22 },
    { surah: 84, name: "Al-Inshiqaq", ayahs: 25 },
    { surah: 83, name: "Al-Mutaffifin", ayahs: 36 },
    { surah: 82, name: "Al-Infitar", ayahs: 19 },
    { surah: 81, name: "At-Takwir", ayahs: 29 },
    { surah: 80, name: "Abasa", ayahs: 42 },
    { surah: 79, name: "An-Nazi'at", ayahs: 46 },
    { surah: 78, name: "An-Naba", ayahs: 40 },
  ];

// Flatten to individual verses: [{surah, ayah, surahName}]
export type VerseRef = { surah: number; ayah: number; surahName: string; globalIndex: number };

export const JUZ30_SEQUENCE: VerseRef[] = (() => {
  const seq: VerseRef[] = [];
  let idx = 0;
  for (const s of JUZ30_SURAHS) {
    for (let a = 1; a <= s.ayahs; a++) {
      seq.push({ surah: s.surah, ayah: a, surahName: s.name, globalIndex: idx++ });
    }
  }
  return seq;
})();

export const TOTAL_JUZ30_VERSES = JUZ30_SEQUENCE.length;

export interface VerseData {
  arabic: string;
  translation: string;
  surahName: string;
  surahNumber: number;
  ayahNumber: number;
  globalIndex: number;
}

export async function fetchVerse(globalIndex: number): Promise<VerseData | null> {
  const ref = JUZ30_SEQUENCE[globalIndex];
  if (!ref) return null;

  try {
    const [arabicRes, engRes] = await Promise.all([
      fetch(
        `https://api.alquran.cloud/v1/ayah/${ref.surah}:${ref.ayah}/ar.alafasy`
      ),
      fetch(
        `https://api.alquran.cloud/v1/ayah/${ref.surah}:${ref.ayah}/en.sahih`
      ),
    ]);

    const [arabicData, engData] = await Promise.all([
      arabicRes.json(),
      engRes.json(),
    ]);

    return {
      arabic: arabicData.data?.text ?? "",
      translation: engData.data?.text ?? "",
      surahName: ref.surahName,
      surahNumber: ref.surah,
      ayahNumber: ref.ayah,
      globalIndex,
    };
  } catch {
    return null;
  }
}

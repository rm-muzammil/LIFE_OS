const juz30Surahs = [
  { number: 114, name: 'An-Nas', verses: 6 },
  { number: 113, name: 'Al-Falaq', verses: 5 },
  { number: 112, name: 'Al-Ikhlas', verses: 4 },
  { number: 111, name: 'Al-Masad', verses: 5 },
  { number: 110, name: 'An-Nasr', verses: 3 },
  { number: 109, name: 'Al-Kafirun', verses: 6 },
  { number: 108, name: 'Al-Kawthar', verses: 3 },
  { number: 107, name: "Al-Ma'un", verses: 7 },
  { number: 106, name: 'Quraysh', verses: 4 },
  { number: 105, name: 'Al-Fil', verses: 5 },
  { number: 104, name: 'Al-Humazah', verses: 9 },
  { number: 103, name: 'Al-Asr', verses: 3 },
  { number: 102, name: 'At-Takathur', verses: 8 },
  { number: 101, name: "Al-Qari'ah", verses: 11 },
  { number: 100, name: "Al-Adiyat", verses: 11 },
  { number: 99, name: 'Az-Zalzalah', verses: 8 },
  { number: 98, name: 'Al-Bayyinah', verses: 8 },
  { number: 97, name: 'Al-Qadr', verses: 5 },
  { number: 96, name: "Al-Alaq", verses: 19 },
  { number: 95, name: 'At-Tin', verses: 8 },
  { number: 94, name: 'Ash-Sharh', verses: 8 },
  { number: 93, name: 'Ad-Duha', verses: 11 },
  { number: 92, name: 'Al-Layl', verses: 21 },
  { number: 91, name: 'Ash-Shams', verses: 15 },
  { number: 90, name: 'Al-Balad', verses: 20 },
  { number: 89, name: 'Al-Fajr', verses: 30 },
  { number: 88, name: 'Al-Ghashiyah', verses: 26 },
  { number: 87, name: "Al-A'la", verses: 19 },
  { number: 86, name: 'At-Tariq', verses: 17 },
  { number: 85, name: 'Al-Buruj', verses: 22 },
  { number: 84, name: 'Al-Inshiqaq', verses: 25 },
  { number: 83, name: 'Al-Mutaffifin', verses: 36 },
  { number: 82, name: 'Al-Infitar', verses: 19 },
  { number: 81, name: 'At-Takwir', verses: 29 },
  { number: 80, name: 'Abasa', verses: 42 },
  { number: 79, name: "An-Nazi'at", verses: 46 },
  { number: 78, name: 'An-Naba', verses: 40 },
] as const;

export const JUZ30_SEQUENCE = juz30Surahs.flatMap(({ number, name, verses }) =>
  Array.from({ length: verses }, (_, index) => ({
    surahNumber: number,
    surahName: name,
    ayahNumber: index + 1,
  }))
);

export const TOTAL_JUZ30_VERSES = JUZ30_SEQUENCE.length;

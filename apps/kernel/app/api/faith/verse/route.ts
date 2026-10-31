import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { defaultDailyLog, getDailyLog, saveDailyLog } from '@/lib/faith/daily-log';
import { getFaithVerseIndex, advanceFaithVerseIndexOnce, setFaithSetting } from '@/lib/faith/settings';
import { isFiniteInteger, isRecord } from '@/lib/faith/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fetchVerse, TOTAL_JUZ30_VERSES } = await import('@/lib/faith/quran-index');
  const index = await getFaithVerseIndex(userId, TOTAL_JUZ30_VERSES);
  const verse = await fetchVerse(index);
  if (!verse) {
    return NextResponse.json({ error: 'Verse unavailable' }, { status: 503 });
  }
  return NextResponse.json(verse);
}

export async function POST() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { TOTAL_JUZ30_VERSES } = await import('@/lib/faith/quran-index');
  const date = new Date().toISOString().slice(0, 10);
  const index = await advanceFaithVerseIndexOnce(userId, date, TOTAL_JUZ30_VERSES);
  const existing = await getDailyLog(userId, date);
  const input = existing
    ? {
        date: existing.date,
        fajr: existing.fajr,
        dhuhr: existing.dhuhr,
        asr: existing.asr,
        maghrib: existing.maghrib,
        isha: existing.isha,
        onTime: existing.onTime,
        morningAdhkar: existing.morningAdhkar,
        eveningAdhkar: existing.eveningAdhkar,
        beforeSleepAdhkar: existing.beforeSleepAdhkar,
        dhikrMinutes: existing.dhikrMinutes,
        duaMinutes: existing.duaMinutes,
        laIlaha: existing.laIlaha,
        subhanallahi: existing.subhanallahi,
        quranPages: existing.quranPages,
        tadabburMinutes: existing.tadabburMinutes,
        tafseerDone: existing.tafseerDone,
        tajweedConfidence: existing.tajweedConfidence,
        verseDone: existing.verseDone,
        islamicStudyMinutes: existing.islamicStudyMinutes,
        surahMulk: existing.surahMulk,
        surahKahf: existing.surahKahf,
        gazeLowered: existing.gazeLowered,
        haramFree: existing.haramFree,
      }
    : defaultDailyLog(date);
  input.verseDone = true;
  await saveDailyLog(userId, input);
  return NextResponse.json({ index, verseDone: true });
}

export async function PUT(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (!isRecord(body) || !isFiniteInteger(body.index)) {
    return NextResponse.json({ error: 'index must be an integer' }, { status: 400 });
  }
  const { TOTAL_JUZ30_VERSES } = await import('@/lib/faith/quran-index');
  const safeIndex = Math.max(0, Math.min(body.index, TOTAL_JUZ30_VERSES - 1));
  await setFaithSetting(userId, 'current_verse_index', String(safeIndex));
  return NextResponse.json({ index: safeIndex });
}

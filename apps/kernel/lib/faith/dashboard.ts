import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { faithSettings } from '@/db/schema';
import { computeFaithStreak, getDailyLog, getRecentDailyLogs } from '@/lib/faith/daily-log';
import { todayPKT } from '@/lib/faith/date';
import { getHijriDate } from '@/lib/faith/hijri';

export async function getFaithDashboardData(userId: string) {
  const today = todayPKT();
  const [existing, recentLogs, streak, settingRows] = await Promise.all([
    getDailyLog(userId, today),
    getRecentDailyLogs(userId, 90),
    computeFaithStreak(userId, today),
    db
      .select({ key: faithSettings.key, value: faithSettings.value })
      .from(faithSettings)
      .where(eq(faithSettings.userId, userId)),
  ]);
  const settings = Object.fromEntries(settingRows.map(({ key, value }) => [key, value]));
  const hijri = await getHijriDate(new Date(), settings);

  const activityData = recentLogs.map((log) => ({
    date: log.date,
    green: isActivityGreen(log),
    score: log.finalScore,
  }));

  return {
    existing,
    activityData,
    streak,
    today,
    hijriFormatted: hijri.formatted,
    hijriFormattedAr: hijri.formattedAr,
    hijriDayName: hijri.dayName,
    hijriSource: hijri.source === 'calculated' ? 'calculated' : 'api',
  };
}

function isActivityGreen(log: {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  tafseerDone: boolean;
  verseDone: boolean;
  laIlaha: boolean;
  subhanallahi: boolean;
}): boolean {
  return Boolean(
    log.fajr &&
      log.dhuhr &&
      log.asr &&
      log.maghrib &&
      log.isha &&
      log.tafseerDone &&
      log.verseDone &&
      log.laIlaha &&
      log.subhanallahi
  );
}

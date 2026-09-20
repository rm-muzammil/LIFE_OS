import { db } from "@/db";
import { dailyLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isActivityGreen } from "@/lib/scoring";
import { DashboardClient } from "./DashboardClient";
import { getHijriDate } from "@/lib/hijri";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function fetchDashboardData(today: string, attempt = 1) {
  try {
    const [existing] = await db
      .select()
      .from(dailyLog)
      .where(eq(dailyLog.date, today))
      .limit(1);

    const recentLogs = await db
      .select({
        date: dailyLog.date,
        fajr: dailyLog.fajr,
        dhuhr: dailyLog.dhuhr,
        asr: dailyLog.asr,
        maghrib: dailyLog.maghrib,
        isha: dailyLog.isha,
        tafseerDone: dailyLog.tafseerDone,
        verseDone: dailyLog.verseDone,
        laIlaha: dailyLog.laIlaha,
        subhanallahi: dailyLog.subhanallahi,
        finalScore: dailyLog.finalScore,
      })
      .from(dailyLog)
      .orderBy(dailyLog.date);

    const activityData = recentLogs.map((r) => ({
      date: r.date,
      green: isActivityGreen(r),
      score: r.finalScore,
    }));

    const sortedDates = recentLogs.map((r) => r.date).sort().reverse();
    let streak = 0;
    for (let i = 0; i < sortedDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (sortedDates[i] === expected.toISOString().slice(0, 10)) streak++;
      else break;
    }

    return { existing: existing ?? null, activityData, streak };
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return fetchDashboardData(today, attempt + 1);
    }
    throw err;
  }
}

export default async function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);

  // Fetch DB data and Hijri date in parallel
  const [{ existing, activityData, streak }, hijri] = await Promise.all([
    fetchDashboardData(today),
    getHijriDate(new Date()),
  ]);

  return (
    <DashboardClient
      existing={existing}
      activityData={activityData}
      streak={streak}
      today={today}
      hijriFormatted={hijri.formatted}
      hijriFormattedAr={hijri.formattedAr}
      hijriDayName={hijri.dayName}
      hijriSource={hijri.source}
    />
  );
}
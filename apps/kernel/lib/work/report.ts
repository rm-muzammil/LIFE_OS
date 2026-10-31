import { getTodayLog, computeStreak } from '@/lib/work/repo';
import type { WorkReport } from '@/lib/work/types';

export async function computeWorkScore(userId: string): Promise<WorkReport> {
  const [today, streak] = await Promise.all([getTodayLog(userId), computeStreak(userId)]);
  return {
    score: today?.score ?? 0,
    label: 'Work',
    streak,
    todayDone: (today?.score ?? 0) > 0,
    updatedAt: new Date().toISOString(),
    details: {
      deepWorkHours: today?.deepWorkHours ?? 0,
      tasksCompleted: today?.tasksCompleted ?? 0,
      milestoneDone: today?.milestoneDone ?? false,
      profDevMinutes: today?.profDevMinutes ?? 0,
      noProcrastination: today?.noProcrastination ?? false,
      clientDeliverable: today?.clientDeliverable ?? false,
    },
  };
}

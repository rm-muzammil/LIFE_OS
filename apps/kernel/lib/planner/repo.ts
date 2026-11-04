import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  plannerCommitmentExceptions,
  plannerCommitments,
  plannerPrayerCache,
  plannerSettings,
  plannerTracks,
  roadmapGoals,
} from '@/db/schema';
import { DEFAULT_PLANNER_SETTINGS } from '@/lib/planner/types';
import type { PlannerSettingsInput } from '@/lib/planner/validation';

export async function getPlannerSettings(userId: string) {
  const [row] = await db.select().from(plannerSettings)
    .where(eq(plannerSettings.userId, userId)).limit(1);
  return row ? { ...row } : { ...DEFAULT_PLANNER_SETTINGS, userId };
}

export async function savePlannerSettings(userId: string, input: PlannerSettingsInput) {
  const [row] = await db.insert(plannerSettings).values({ userId, ...input })
    .onConflictDoUpdate({
      target: plannerSettings.userId,
      set: { ...input, updatedAt: new Date() },
    })
    .returning();
  await db.delete(plannerPrayerCache).where(eq(plannerPrayerCache.userId, userId));
  return row;
}

export async function listCommitments(userId: string) {
  return db.select().from(plannerCommitments)
    .where(eq(plannerCommitments.userId, userId))
    .orderBy(asc(plannerCommitments.weekday), asc(plannerCommitments.date), asc(plannerCommitments.startTime));
}

export async function getCommitment(userId: string, id: string) {
  const [row] = await db.select().from(plannerCommitments)
    .where(and(eq(plannerCommitments.userId, userId), eq(plannerCommitments.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createCommitment(userId: string, input: PlannerCommitmentInput) {
  const [row] = await db.insert(plannerCommitments).values({ userId, ...input }).returning();
  return row;
}

export type PlannerCommitmentInput = {
  title: string;
  kind: 'lecture' | 'work' | 'other';
  weekday: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  validFrom: string | null;
  validTo: string | null;
  location: string | null;
  notes: string | null;
  active: boolean;
};

export async function updateCommitment(
  userId: string,
  id: string,
  input: Partial<PlannerCommitmentInput>
) {
  const [row] = await db.update(plannerCommitments)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(plannerCommitments.userId, userId), eq(plannerCommitments.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteCommitment(userId: string, id: string) {
  const [row] = await db.delete(plannerCommitments)
    .where(and(eq(plannerCommitments.userId, userId), eq(plannerCommitments.id, id)))
    .returning({ id: plannerCommitments.id });
  return row ?? null;
}

export async function listCommitmentExceptions(userId: string, date: string) {
  return db.select().from(plannerCommitmentExceptions)
    .where(and(
      eq(plannerCommitmentExceptions.userId, userId),
      eq(plannerCommitmentExceptions.date, date)
    ));
}

export async function cancelCommitmentDate(userId: string, commitmentId: string, date: string) {
  await db.insert(plannerCommitmentExceptions)
    .values({ userId, commitmentId, date })
    .onConflictDoNothing({
      target: [
        plannerCommitmentExceptions.userId,
        plannerCommitmentExceptions.commitmentId,
        plannerCommitmentExceptions.date,
      ],
    });
}

export async function restoreCommitmentDate(userId: string, commitmentId: string, date: string) {
  const [row] = await db.delete(plannerCommitmentExceptions)
    .where(and(
      eq(plannerCommitmentExceptions.userId, userId),
      eq(plannerCommitmentExceptions.commitmentId, commitmentId),
      eq(plannerCommitmentExceptions.date, date)
    ))
    .returning({ date: plannerCommitmentExceptions.date });
  return row ?? null;
}

export async function listTracks(userId: string) {
  return db.select().from(plannerTracks)
    .where(eq(plannerTracks.userId, userId))
    .orderBy(asc(plannerTracks.priority), asc(plannerTracks.title));
}

export async function getTrack(userId: string, id: string) {
  const [row] = await db.select().from(plannerTracks)
    .where(and(eq(plannerTracks.userId, userId), eq(plannerTracks.id, id)))
    .limit(1);
  return row ?? null;
}

export async function hasPlannerGoal(userId: string, goalId: string) {
  const [row] = await db.select({ id: roadmapGoals.id }).from(roadmapGoals)
    .where(and(eq(roadmapGoals.userId, userId), eq(roadmapGoals.id, goalId)))
    .limit(1);
  return Boolean(row);
}

export async function createTrack(
  userId: string,
  input: {
    title: string;
    domain: string;
    weeklyTargetMinutes: number;
    minSessionMinutes: number;
    maxSessionMinutes: number;
    maxPerDayMinutes: number;
    preferredWindow: string;
    allowedWeekdays: number;
    priority: string;
    active: boolean;
    goalId: string | null;
  }
) {
  const [row] = await db.insert(plannerTracks).values({ userId, ...input }).returning();
  return row;
}

export async function updateTrack(
  userId: string,
  id: string,
  input: Partial<{
    title: string;
    domain: string;
    weeklyTargetMinutes: number;
    minSessionMinutes: number;
    maxSessionMinutes: number;
    maxPerDayMinutes: number;
    preferredWindow: string;
    allowedWeekdays: number;
    priority: string;
    active: boolean;
    goalId: string | null;
  }>
) {
  const [row] = await db.update(plannerTracks)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(plannerTracks.userId, userId), eq(plannerTracks.id, id)))
    .returning();
  return row ?? null;
}

export async function deleteTrack(userId: string, id: string) {
  const [row] = await db.delete(plannerTracks)
    .where(and(eq(plannerTracks.userId, userId), eq(plannerTracks.id, id)))
    .returning({ id: plannerTracks.id });
  return row ?? null;
}

export async function getCachedPrayerTimes(userId: string, date: string) {
  const [row] = await db.select().from(plannerPrayerCache)
    .where(and(
      eq(plannerPrayerCache.userId, userId),
      eq(plannerPrayerCache.date, date)
    ))
    .limit(1);
  return row ?? null;
}

export async function cachePrayerTimes(
  userId: string,
  date: string,
  times: { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string },
  source: 'auto' | 'manual' | 'default'
) {
  await db.insert(plannerPrayerCache).values({ userId, date, ...times, source })
    .onConflictDoUpdate({
      target: [plannerPrayerCache.userId, plannerPrayerCache.date],
      set: { ...times, source, createdAt: new Date() },
    });
}

import type { PlannerBlock, PreferredWindow, PlannerPriority } from '@/lib/planner/types';
import { parseTimeToMinutes, weekdayForDate } from '@/lib/planner/time';
import { buildSleepBlocks, computeFreeGaps } from '@/lib/planner/blocks';

const LAST_PLANNING_MINUTE = 1439;

export type PlannerSessionKind = 'roadmap' | 'track' | 'flexible';
export type PlanMode = 'full' | 'from-now';
export type DroppedReason = 'no-gap' | 'daily-cap' | 'overbooked';

export interface PlannerEngineSettings {
  wakeTime: string;
  sleepTime: string;
  breakMinutes: number;
  minSessionMinutes: number;
  slackPercent: number;
  defaultTaskMinutes: number;
  preferredSessionMinutes: number;
  weekStart: number;
  stretchEnabled: boolean;
}

export interface RoadmapTaskCandidate {
  id: string;
  title: string;
  dueDate: string;
  estimateMinutes: number | null;
  priority: number;
}

export interface TrackCandidate {
  id: string;
  title: string;
  weeklyTargetMinutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
  maxPerDayMinutes: number;
  preferredWindow: PreferredWindow;
  allowedWeekdays: number;
  priority: PlannerPriority;
}

export interface FlexibleCandidate {
  id: string;
  title: string;
  description: string;
  minutes: number;
  priority?: number;
}

export interface PlannedSession {
  id: string;
  title: string;
  description: string;
  kind: PlannerSessionKind;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  roadmapTaskId?: string;
  trackId?: string;
  extra?: true;
}

export interface DroppedPlanItem {
  id: string;
  title: string;
  kind: PlannerSessionKind;
  reason: DroppedReason;
  remainingMinutes: number;
}

export interface PlannerEngineInput {
  date: string;
  nowMinute: number;
  settings: PlannerEngineSettings;
  fixedBlocks: PlannerBlock[];
  roadmapTasks: RoadmapTaskCandidate[];
  tracks: TrackCandidate[];
  trackMinutesDone: Readonly<Record<string, number>>;
  flexibleItems?: FlexibleCandidate[];
}

export interface PlannerEngineResult {
  sessions: PlannedSession[];
  dropped: DroppedPlanItem[];
  freeMinutes: number;
  schedulableMinutes: number;
}

interface MutableGap {
  startMinute: number;
  endMinute: number;
  cursorMinute: number;
  hasSession: boolean;
}

interface CandidateState {
  id: string;
  title: string;
  description: string;
  kind: PlannerSessionKind;
  remainingMinutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
  priority: number;
  roadmapTaskId?: string;
  trackId?: string;
  preferredWindow?: PreferredWindow;
  extra?: true;
}

export interface TrackQuotaDay {
  remainingMinutes: number;
  sessionSize: number;
  sessionsNeeded: number;
  remainingAllowedDays: number;
  sessionsToday: number;
  sessionMinutesToday: number[];
  dailyCapMinutes: number;
}

function compareText(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function compareTasks(first: RoadmapTaskCandidate, second: RoadmapTaskCandidate): number {
  return compareText(first.dueDate, second.dueDate) ||
    first.priority - second.priority ||
    compareText(first.title, second.title) ||
    compareText(first.id, second.id);
}

function compareFlexible(first: FlexibleCandidate, second: FlexibleCandidate): number {
  return (first.priority ?? 5) - (second.priority ?? 5) ||
    compareText(first.title, second.title) ||
    compareText(first.id, second.id);
}

function weekdayIsAllowed(track: TrackCandidate, weekday: number): boolean {
  return (track.allowedWeekdays & (1 << weekday)) !== 0;
}

function getAllowedDaysRemaining(
  date: string,
  weekStart: number,
  track: TrackCandidate
): number[] {
  if (!Number.isInteger(weekStart) || weekStart < 0 || weekStart > 6) {
    throw new RangeError('Week start must be a weekday from 0 to 6');
  }
  const weekday = weekdayForDate(date);
  const offset = (weekday - weekStart + 7) % 7;
  const remainingCalendarDays = 7 - offset;
  const allowed: number[] = [];
  for (let day = 0; day < remainingCalendarDays; day += 1) {
    const candidateWeekday = (weekday + day) % 7;
    if (weekdayIsAllowed(track, candidateWeekday)) allowed.push(candidateWeekday);
  }
  return allowed;
}

function balanceSessionMinutes(remainingMinutes: number, sessionsNeeded: number): number[] {
  if (sessionsNeeded < 1) return [];
  const base = Math.floor(remainingMinutes / sessionsNeeded);
  const remainder = remainingMinutes % sessionsNeeded;
  return Array.from({ length: sessionsNeeded }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function getTrackSessionSizes(
  remainingMinutes: number,
  sessionsNeeded: number,
  minSessionMinutes: number,
  maxSessionMinutes: number
): number[] {
  return mergeSubminimumRemainders(
    balanceSessionMinutes(remainingMinutes, sessionsNeeded),
    minSessionMinutes,
    maxSessionMinutes
  );
}

export function spreadSessionsAcrossAllowedDays(
  sessionsNeeded: number,
  remainingAllowedDays: number
): number[] {
  if (sessionsNeeded <= 0 || remainingAllowedDays <= 0) {
    return Array.from({ length: Math.max(0, remainingAllowedDays) }, () => 0);
  }
  if (sessionsNeeded > remainingAllowedDays) {
    return Array.from(
      { length: remainingAllowedDays },
      () => Math.ceil(sessionsNeeded / remainingAllowedDays)
    );
  }
  return Array.from({ length: remainingAllowedDays }, (_, index) =>
    Math.floor(((index + 1) * sessionsNeeded) / remainingAllowedDays) -
    Math.floor((index * sessionsNeeded) / remainingAllowedDays)
  );
}

function mergeSubminimumRemainders(
  sessionMinutes: number[],
  minSessionMinutes: number,
  maxSessionMinutes: number
): number[] {
  const merged: number[] = [];
  for (const minutes of sessionMinutes) {
    if (
      minutes < minSessionMinutes &&
      merged.length > 0 &&
      merged[merged.length - 1] + minutes <= maxSessionMinutes
    ) {
      merged[merged.length - 1] += minutes;
    } else {
      merged.push(minutes);
    }
  }
  return merged.filter((minutes) => minutes >= minSessionMinutes);
}

export function getTrackDailyQuota(params: {
  date: string;
  weekStart: number;
  preferredSessionMinutes: number;
  track: TrackCandidate;
  minutesDone: number;
}): TrackQuotaDay {
  const remainingMinutes = Math.max(
    0,
    params.track.weeklyTargetMinutes - Math.max(0, params.minutesDone)
  );
  const sessionSize = Math.min(
    params.track.maxSessionMinutes,
    Math.max(params.track.minSessionMinutes, params.preferredSessionMinutes)
  );
  const sessionsNeeded = remainingMinutes > 0 ? Math.ceil(remainingMinutes / sessionSize) : 0;
  const allowedDays = getAllowedDaysRemaining(params.date, params.weekStart, params.track);
  const dayIndex = allowedDays.indexOf(weekdayForDate(params.date));
  let sessionsToday = 0;
  if (dayIndex >= 0 && allowedDays.length > 0 && sessionsNeeded > 0) {
    sessionsToday = spreadSessionsAcrossAllowedDays(
      sessionsNeeded,
      allowedDays.length
    )[dayIndex] ?? 0;
  }

  const balanced = getTrackSessionSizes(
    remainingMinutes,
    sessionsNeeded,
    params.track.minSessionMinutes,
    params.track.maxSessionMinutes
  );
  const selected = balanced.slice(0, sessionsToday);
  let dailyCapMinutes = 0;
  let total = 0;
  const sessionMinutesToday: number[] = [];
  for (const minutes of selected) {
    if (total + minutes > params.track.maxPerDayMinutes) {
      dailyCapMinutes += minutes;
      continue;
    }
    sessionMinutesToday.push(minutes);
    total += minutes;
  }
  return {
    remainingMinutes,
    sessionSize,
    sessionsNeeded,
    remainingAllowedDays: allowedDays.length,
    sessionsToday,
    sessionMinutesToday,
    dailyCapMinutes,
  };
}

function preferredWindowRange(
  window: PreferredWindow,
  wakeMinute: number,
  sleepMinute: number
): { start: number; end: number } | null {
  const planningEnd = sleepMinute > wakeMinute ? sleepMinute : LAST_PLANNING_MINUTE;
  const ranges: Record<Exclude<PreferredWindow, 'any'>, [number, number]> = {
    morning: [wakeMinute, wakeMinute + 360],
    afternoon: [wakeMinute + 360, wakeMinute + 720],
    evening: [wakeMinute + 720, wakeMinute + 960],
    night: [wakeMinute + 960, planningEnd],
  };
  if (window === 'any') return null;
  const [start, end] = ranges[window];
  return { start: Math.max(wakeMinute, start), end: Math.min(planningEnd, end) };
}

function availableSlots(
  gaps: MutableGap[],
  breakMinutes: number,
  budgetRemaining: number,
  preferredRange: { start: number; end: number } | null
): Array<{ gap: MutableGap; start: number; available: number }> {
  return gaps.flatMap((gap) => {
    const start = Math.max(
      gap.cursorMinute + (gap.hasSession ? breakMinutes : 0),
      preferredRange?.start ?? 0
    );
    const end = Math.min(gap.endMinute, preferredRange?.end ?? LAST_PLANNING_MINUTE);
    const available = Math.min(end - start, budgetRemaining);
    return available > 0 ? [{ gap, start, available }] : [];
  }).sort((first, second) =>
    first.start - second.start || first.gap.endMinute - second.gap.endMinute
  );
}

function addDropped(
  dropped: DroppedPlanItem[],
  candidate: CandidateState,
  reason: DroppedReason
): void {
  if (candidate.remainingMinutes <= 0) return;
  const existing = dropped.find((item) => item.id === candidate.id && item.reason === reason);
  if (existing) {
    existing.remainingMinutes += candidate.remainingMinutes;
    return;
  }
  dropped.push({
    id: candidate.id,
    title: candidate.title,
    kind: candidate.kind,
    reason,
    remainingMinutes: candidate.remainingMinutes,
  });
}

function createCandidateState(params: {
  id: string;
  title: string;
  description: string;
  kind: PlannerSessionKind;
  minutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
  priority: number;
  roadmapTaskId?: string;
  trackId?: string;
  preferredWindow?: PreferredWindow;
  extra?: true;
}): CandidateState {
  return { ...params, remainingMinutes: params.minutes };
}

function trackWeight(priority: PlannerPriority): number {
  return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
}

function createTrackTurnList(tracks: CandidateState[]): string[] {
  const byTrack = new Map<string, CandidateState>();
  for (const track of tracks) {
    if (track.trackId && !byTrack.has(track.trackId)) byTrack.set(track.trackId, track);
  }
  return [...byTrack.entries()].flatMap(([trackId, track]) =>
    Array.from({ length: track.priority }, () => trackId)
  );
}

function pickTrackTurn(
  turns: string[],
  cursor: number,
  active: CandidateState[],
  previousTrackId: string | null
): { candidate: CandidateState | null; nextCursor: number } {
  if (active.length === 0 || turns.length === 0) return { candidate: null, nextCursor: cursor };
  const activeTrackIds = new Set(active.map((candidate) => candidate.trackId));
  for (let step = 0; step < turns.length; step += 1) {
    const index = (cursor + step) % turns.length;
    const trackId = turns[index];
    if (
      activeTrackIds.has(trackId) &&
      (trackId !== previousTrackId || activeTrackIds.size === 1)
    ) {
      return {
        candidate: active.find((candidate) => candidate.trackId === trackId) ?? null,
        nextCursor: (index + 1) % turns.length,
      };
    }
  }
  const index = turns.findIndex((trackId) => activeTrackIds.has(trackId));
  return index < 0
    ? { candidate: null, nextCursor: cursor }
    : {
        candidate: active.find((candidate) => candidate.trackId === turns[index]) ?? null,
        nextCursor: (index + 1) % turns.length,
      };
}

function droppedReason(
  candidate: CandidateState,
  budgetRemaining: number,
  minSessionMinutes: number
): DroppedReason {
  if (budgetRemaining < minSessionMinutes) return 'overbooked';
  return 'no-gap';
}

export function buildPlannerPlan(input: PlannerEngineInput): PlannerEngineResult {
  const wakeMinute = parseTimeToMinutes(input.settings.wakeTime);
  const sleepMinute = parseTimeToMinutes(input.settings.sleepTime);
  const sessions: PlannedSession[] = [];
  const dropped: DroppedPlanItem[] = [];
  if (wakeMinute === null || sleepMinute === null) {
    return { sessions, dropped, freeMinutes: 0, schedulableMinutes: 0 };
  }

  const candidates: CandidateState[] = [];
  for (const task of input.roadmapTasks
    .filter((candidate) => candidate.dueDate <= input.date)
    .sort(compareTasks)) {
    candidates.push(createCandidateState({
      id: `roadmap-${task.id}`,
      title: task.title,
      description: 'Roadmap task',
      kind: 'roadmap',
      minutes: task.estimateMinutes ?? input.settings.defaultTaskMinutes,
      minSessionMinutes: input.settings.minSessionMinutes,
      maxSessionMinutes: Number.MAX_SAFE_INTEGER,
      priority: task.priority,
      roadmapTaskId: task.id,
    }));
  }
  for (const item of [...(input.flexibleItems ?? [])].sort(compareFlexible)) {
    candidates.push(createCandidateState({
      id: `flexible-${item.id}`,
      title: item.title,
      description: item.description,
      kind: 'flexible',
      minutes: item.minutes,
      minSessionMinutes: input.settings.minSessionMinutes,
      maxSessionMinutes: Number.MAX_SAFE_INTEGER,
      priority: item.priority ?? 5,
    }));
  }

  const weekday = weekdayForDate(input.date);
  const eligibleTracks = input.tracks
    .filter((track) => weekdayIsAllowed(track, weekday))
    .sort((first, second) =>
      compareText(first.title, second.title) || compareText(first.id, second.id)
    );
  const quotaSessions: CandidateState[] = [];
  const quotaDrops: DroppedPlanItem[] = [];
  for (const track of eligibleTracks) {
    const quota = getTrackDailyQuota({
      date: input.date,
      weekStart: input.settings.weekStart,
      preferredSessionMinutes: input.settings.preferredSessionMinutes,
      track,
      minutesDone: input.trackMinutesDone[track.id] ?? 0,
    });
    quota.sessionMinutesToday.forEach((minutes, index) => {
      quotaSessions.push(createCandidateState({
        id: `track-${track.id}-quota-${index + 1}`,
        title: track.title,
        description: 'Learning track',
        kind: 'track',
        minutes,
        minSessionMinutes: track.minSessionMinutes,
        maxSessionMinutes: track.maxSessionMinutes,
        priority: trackWeight(track.priority),
        trackId: track.id,
        preferredWindow: track.preferredWindow,
      }));
    });
    if (quota.dailyCapMinutes > 0) {
      quotaDrops.push({
        id: `track-${track.id}`,
        title: track.title,
        kind: 'track',
        reason: 'daily-cap',
        remainingMinutes: quota.dailyCapMinutes,
      });
    }
  }

  const planStart = Math.max(wakeMinute, Math.min(LAST_PLANNING_MINUTE, Math.max(0, input.nowMinute)));
  const freeGaps = computeFreeGaps(
    [...input.fixedBlocks, ...buildSleepBlocks(input.settings)],
    planStart,
    LAST_PLANNING_MINUTE
  );
  const freeMinutes = freeGaps.reduce((total, gap) => total + gap.minutes, 0);
  const schedulableMinutes = Math.floor(
    freeMinutes * (100 - input.settings.slackPercent) / 100
  );
  const gaps: MutableGap[] = freeGaps.map((gap) => ({
    startMinute: gap.startMinute,
    endMinute: gap.endMinute,
    cursorMinute: gap.startMinute,
    hasSession: false,
  }));
  let budgetRemaining = schedulableMinutes;
  let sessionNumber = 0;
  const trackMinutesToday = new Map<string, number>();

  const placeCandidate = (candidate: CandidateState): boolean => {
    if (candidate.remainingMinutes < candidate.minSessionMinutes) return false;
    const preferred = candidate.kind === 'track' && candidate.preferredWindow
      ? preferredWindowRange(candidate.preferredWindow, wakeMinute, sleepMinute)
      : null;
    let slots = availableSlots(gaps, input.settings.breakMinutes, budgetRemaining, preferred);
    if (preferred && !slots.some((slot) => slot.available >= candidate.minSessionMinutes)) {
      slots = availableSlots(gaps, input.settings.breakMinutes, budgetRemaining, null);
    }
    const slot = slots.find((value) =>
      value.available >= candidate.minSessionMinutes &&
      Math.min(value.available, candidate.maxSessionMinutes, candidate.remainingMinutes) >= candidate.minSessionMinutes
    );
    if (!slot) return false;
    const plannedMinutes = Math.min(
      slot.available,
      candidate.maxSessionMinutes,
      candidate.remainingMinutes
    );
    const endMinute = slot.start + plannedMinutes;
    sessionNumber += 1;
    sessions.push({
      id: `${candidate.id}-session-${sessionNumber}`,
      title: candidate.title,
      description: candidate.description,
      kind: candidate.kind,
      startTime: `${String(Math.floor(slot.start / 60)).padStart(2, '0')}:${String(slot.start % 60).padStart(2, '0')}`,
      endTime: `${String(Math.floor(endMinute / 60)).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`,
      plannedMinutes,
      ...(candidate.roadmapTaskId ? { roadmapTaskId: candidate.roadmapTaskId } : {}),
      ...(candidate.trackId ? { trackId: candidate.trackId } : {}),
      ...(candidate.extra ? { extra: true as const } : {}),
    });
    slot.gap.cursorMinute = endMinute;
    slot.gap.hasSession = true;
    candidate.remainingMinutes -= plannedMinutes;
    budgetRemaining -= plannedMinutes;
    if (candidate.trackId) {
      trackMinutesToday.set(
        candidate.trackId,
        (trackMinutesToday.get(candidate.trackId) ?? 0) + plannedMinutes
      );
    }
    return true;
  };

  for (const candidate of candidates) {
    while (candidate.remainingMinutes >= candidate.minSessionMinutes) {
      if (!placeCandidate(candidate)) break;
    }
    if (candidate.remainingMinutes > 0) {
      addDropped(dropped, candidate, droppedReason(candidate, budgetRemaining, candidate.minSessionMinutes));
    }
  }

  const trackTurns = createTrackTurnList(quotaSessions);
  const activeQuotaSessions = [...quotaSessions];
  let quotaCursor = 0;
  let previousTrackId: string | null = null;
  while (activeQuotaSessions.length > 0) {
    const picked = pickTrackTurn(trackTurns, quotaCursor, activeQuotaSessions, previousTrackId);
    quotaCursor = picked.nextCursor;
    if (!picked.candidate) break;
    const candidate = picked.candidate;
    if (placeCandidate(candidate)) {
      previousTrackId = candidate.trackId ?? null;
      if (candidate.remainingMinutes <= 0) {
        activeQuotaSessions.splice(activeQuotaSessions.indexOf(candidate), 1);
      }
    } else {
      addDropped(dropped, candidate, droppedReason(candidate, budgetRemaining, candidate.minSessionMinutes));
      activeQuotaSessions.splice(activeQuotaSessions.indexOf(candidate), 1);
    }
  }
  dropped.push(...quotaDrops);

  if (input.settings.stretchEnabled && budgetRemaining >= input.settings.minSessionMinutes) {
    const stretchCandidates = eligibleTracks.flatMap((track) => {
      const alreadyPlanned = trackMinutesToday.get(track.id) ?? 0;
      const remainingDayCapacity = track.maxPerDayMinutes - alreadyPlanned;
      const maxSession = Math.min(
        track.maxSessionMinutes,
        input.settings.preferredSessionMinutes,
        remainingDayCapacity
      );
      return remainingDayCapacity >= track.minSessionMinutes && maxSession >= track.minSessionMinutes
        ? [createCandidateState({
            id: `track-${track.id}-extra`,
            title: track.title,
            description: 'Optional extra learning session',
            kind: 'track',
            minutes: remainingDayCapacity,
            minSessionMinutes: track.minSessionMinutes,
            maxSessionMinutes: maxSession,
            priority: trackWeight(track.priority),
            trackId: track.id,
            preferredWindow: track.preferredWindow,
            extra: true,
          })]
        : [];
    });
    const turns = createTrackTurnList(stretchCandidates);
    const active = [...stretchCandidates];
    let cursor = 0;
    previousTrackId = null;
    while (active.length > 0 && budgetRemaining >= input.settings.minSessionMinutes) {
      const picked = pickTrackTurn(turns, cursor, active, previousTrackId);
      cursor = picked.nextCursor;
      if (!picked.candidate) break;
      const candidate = picked.candidate;
      if (placeCandidate(candidate)) {
        previousTrackId = candidate.trackId ?? null;
        if (candidate.remainingMinutes < candidate.minSessionMinutes) {
          active.splice(active.indexOf(candidate), 1);
        }
      } else {
        active.splice(active.indexOf(candidate), 1);
      }
    }
  }

  sessions.sort((first, second) =>
    (parseTimeToMinutes(first.startTime) ?? 0) - (parseTimeToMinutes(second.startTime) ?? 0) ||
    compareText(first.id, second.id)
  );
  return { sessions, dropped, freeMinutes, schedulableMinutes };
}

export interface ExistingPlannerEntry {
  id: string;
  status: string;
  source?: string;
  startTime?: string;
  locked?: boolean;
}

export function getReplaceablePlannerEntryIds(
  entries: ExistingPlannerEntry[],
  mode: PlanMode,
  nowMinute: number
): string[] {
  return entries.filter((entry) => {
    if (entry.source !== 'planner' || entry.status !== 'pending') return false;
    if (mode === 'from-now' && entry.locked) return false;
    const start = entry.startTime ? parseTimeToMinutes(entry.startTime) : null;
    return start !== null && start >= nowMinute;
  }).map((entry) => entry.id);
}

export function dispatchGenerationMode<T>(params: {
  engineEnabled: boolean;
  planner: () => T;
  legacy: () => T;
}): T {
  return params.engineEnabled ? params.planner() : params.legacy();
}

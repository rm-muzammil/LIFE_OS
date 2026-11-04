import type { PlannerBlock, PreferredWindow, PlannerPriority } from '@/lib/planner/types';
import { parseTimeToMinutes, weekdayForDate } from '@/lib/planner/time';

export type PlannerSessionKind = 'roadmap' | 'track' | 'flexible';
export type PlanMode = 'full' | 'from-now';
export type DroppedReason =
  | 'no-gap'
  | 'overbooked'
  | 'quota-capped'
  | 'below-minimum'
  | 'invalid-window';

export interface PlannerEngineSettings {
  wakeTime: string;
  sleepTime: string;
  breakMinutes: number;
  minSessionMinutes: number;
  slackPercent: number;
  defaultTaskMinutes: number;
  weekStart: number;
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

export function getTrackDailyQuota(params: {
  date: string;
  weekStart: number;
  track: TrackCandidate;
  minutesDone: number;
}): { remainingMinutes: number; remainingAllowedDays: number; targetMinutes: number; cappedMinutes: number } {
  if (!Number.isInteger(params.weekStart) || params.weekStart < 0 || params.weekStart > 6) {
    throw new RangeError('Week start must be a weekday from 0 to 6');
  }
  const weekday = weekdayForDate(params.date);
  const offset = (weekday - params.weekStart + 7) % 7;
  const remainingDaysInWeek = 7 - offset;
  let remainingAllowedDays = 0;
  for (let day = 0; day < remainingDaysInWeek; day += 1) {
    if (weekdayIsAllowed(params.track, (weekday + day) % 7)) remainingAllowedDays += 1;
  }
  const remainingMinutes = Math.max(
    0,
    params.track.weeklyTargetMinutes - Math.max(0, params.minutesDone)
  );
  const targetMinutes = remainingAllowedDays === 0
    ? 0
    : Math.ceil(remainingMinutes / remainingAllowedDays);
  return {
    remainingMinutes,
    remainingAllowedDays,
    targetMinutes,
    cappedMinutes: Math.min(targetMinutes, params.track.maxPerDayMinutes),
  };
}

function preferredWindowRange(
  window: PreferredWindow,
  wakeMinute: number,
  sleepMinute: number
): { start: number; end: number } | null {
  const ranges: Record<Exclude<PreferredWindow, 'any'>, [number, number]> = {
    morning: [wakeMinute, wakeMinute + 360],
    afternoon: [wakeMinute + 360, wakeMinute + 720],
    evening: [wakeMinute + 720, wakeMinute + 960],
    night: [wakeMinute + 960, sleepMinute],
  };
  if (window === 'any') return null;
  const [start, end] = ranges[window];
  return { start: Math.max(wakeMinute, start), end: Math.min(sleepMinute, end) };
}

function availableSlots(
  gaps: MutableGap[],
  breakMinutes: number,
  budgetRemaining: number,
  preferredRange: { start: number; end: number } | null
): Array<{ gap: MutableGap; start: number; available: number }> {
  const slots = gaps.flatMap((gap) => {
    const start = Math.max(gap.cursorMinute + (gap.hasSession ? breakMinutes : 0), preferredRange?.start ?? 0);
    const end = Math.min(gap.endMinute, preferredRange?.end ?? 1440);
    const available = Math.min(end - start - breakMinutes, budgetRemaining - breakMinutes);
    return available > 0 ? [{ gap, start, available }] : [];
  });
  return slots.sort((first, second) => first.start - second.start ||
    first.gap.endMinute - second.gap.endMinute);
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
}): CandidateState {
  return { ...params, remainingMinutes: params.minutes };
}

function createTrackTurnList(tracks: CandidateState[]): CandidateState[] {
  return tracks.flatMap((track) => Array.from(
    { length: track.priority },
    () => track
  ));
}

function trackWeight(priority: PlannerPriority): number {
  return priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
}

function pickTrackTurn(
  turns: CandidateState[],
  cursor: number,
  active: CandidateState[],
  previousTrackId: string | null
): { candidate: CandidateState | null; nextCursor: number } {
  if (active.length === 0 || turns.length === 0) return { candidate: null, nextCursor: cursor };
  for (let step = 0; step < turns.length; step += 1) {
    const index = (cursor + step) % turns.length;
    const turn = turns[index];
    if (
      active.includes(turn) &&
      (turn.trackId !== previousTrackId || active.length === 1)
    ) {
      return { candidate: turn, nextCursor: (index + 1) % turns.length };
    }
  }
  const index = turns.findIndex((turn) => active.includes(turn));
  return index < 0
    ? { candidate: null, nextCursor: cursor }
    : { candidate: turns[index], nextCursor: (index + 1) % turns.length };
}

export function buildPlannerPlan(input: PlannerEngineInput): PlannerEngineResult {
  const wakeMinute = parseTimeToMinutes(input.settings.wakeTime);
  const sleepMinute = parseTimeToMinutes(input.settings.sleepTime);
  const invalidWindow = wakeMinute === null || sleepMinute === null || sleepMinute <= wakeMinute;
  const sessions: PlannedSession[] = [];
  const dropped: DroppedPlanItem[] = [];
  const candidates: CandidateState[] = [];
  const addCandidate = (candidate: CandidateState) => {
    if (candidate.remainingMinutes > 0) candidates.push(candidate);
  };

  for (const task of input.roadmapTasks
    .filter((candidate) => candidate.dueDate <= input.date)
    .sort(compareTasks)) {
    addCandidate(createCandidateState({
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
    addCandidate(createCandidateState({
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
  const trackCandidates: CandidateState[] = [];
  for (const track of [...input.tracks].sort((a, b) =>
    compareText(a.title, b.title) || compareText(a.id, b.id)
  )) {
    if (!weekdayIsAllowed(track, weekday)) continue;
    const quota = getTrackDailyQuota({
      date: input.date,
      weekStart: input.settings.weekStart,
      track,
      minutesDone: input.trackMinutesDone[track.id] ?? 0,
    });
    if (quota.targetMinutes > quota.cappedMinutes) {
      dropped.push({
        id: `track-${track.id}`,
        title: track.title,
        kind: 'track',
        reason: 'quota-capped',
        remainingMinutes: quota.targetMinutes - quota.cappedMinutes,
      });
    }
    if (quota.cappedMinutes > 0) {
      const state = createCandidateState({
        id: `track-${track.id}`,
        title: track.title,
        description: 'Learning track',
        kind: 'track',
        minutes: quota.cappedMinutes,
        minSessionMinutes: track.minSessionMinutes,
        maxSessionMinutes: track.maxSessionMinutes,
        priority: trackWeight(track.priority),
        trackId: track.id,
        preferredWindow: track.preferredWindow,
      });
      trackCandidates.push(state);
      addCandidate(state);
    }
  }

  if (invalidWindow) {
    for (const candidate of candidates) addDropped(dropped, candidate, 'invalid-window');
    return { sessions, dropped, freeMinutes: 0, schedulableMinutes: 0 };
  }

  const planStart = Math.max(wakeMinute, Math.min(1440, Math.max(0, input.nowMinute)));
  const gapsRaw = input.fixedBlocks
    .map((block) => ({
      startMinute: Math.max(planStart, block.startMinute),
      endMinute: Math.min(sleepMinute, block.endMinute),
    }))
    .filter((block) => block.endMinute > block.startMinute)
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  const freeGaps: Array<{ startMinute: number; endMinute: number }> = [];
  let gapCursor = planStart;
  for (const block of gapsRaw) {
    if (block.startMinute > gapCursor) {
      freeGaps.push({ startMinute: gapCursor, endMinute: block.startMinute });
    }
    gapCursor = Math.max(gapCursor, block.endMinute);
  }
  if (gapCursor < sleepMinute) freeGaps.push({ startMinute: gapCursor, endMinute: sleepMinute });

  const freeMinutes = freeGaps.reduce(
    (total, gap) => total + gap.endMinute - gap.startMinute,
    0
  );
  const schedulableMinutes = Math.floor(
    freeMinutes * (100 - input.settings.slackPercent) / 100
  );
  const gaps: MutableGap[] = freeGaps.map((gap) => ({
    ...gap,
    cursorMinute: gap.startMinute,
    hasSession: false,
  }));
  let budgetRemaining = schedulableMinutes;
  let sessionNumber = 0;

  const placeCandidate = (candidate: CandidateState): boolean => {
    const preferred = candidate.kind === 'track' && candidate.preferredWindow
      ? preferredWindowRange(candidate.preferredWindow, wakeMinute, sleepMinute)
      : null;
    let slots = availableSlots(gaps, input.settings.breakMinutes, budgetRemaining, preferred);
    if (preferred && !slots.some((slot) => slot.available >= candidate.minSessionMinutes)) {
      slots = availableSlots(gaps, input.settings.breakMinutes, budgetRemaining, null);
    }
    const slot = slots.find((value) => value.available >= candidate.minSessionMinutes);
    if (!slot) return false;
    const minutes = Math.min(
      slot.available,
      candidate.maxSessionMinutes,
      candidate.remainingMinutes
    );
    if (minutes < candidate.minSessionMinutes) return false;
    const plannedMinutes = minutes;
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
    });
    slot.gap.cursorMinute = endMinute;
    slot.gap.hasSession = true;
    candidate.remainingMinutes -= plannedMinutes;
    budgetRemaining -= plannedMinutes + input.settings.breakMinutes;
    return true;
  };

  const taskAndFlexible = candidates.filter((candidate) => candidate.kind !== 'track');
  for (const candidate of taskAndFlexible) {
    while (candidate.remainingMinutes >= candidate.minSessionMinutes) {
      if (!placeCandidate(candidate)) break;
    }
    if (candidate.remainingMinutes > 0) {
      addDropped(
        dropped,
        candidate,
        candidate.remainingMinutes < candidate.minSessionMinutes
          ? 'below-minimum'
          : budgetRemaining < candidate.minSessionMinutes + input.settings.breakMinutes
            ? 'overbooked'
            : 'no-gap'
      );
    }
  }

  const activeTracks = trackCandidates.filter((candidate) => candidate.remainingMinutes > 0);
  const turns = createTrackTurnList(trackCandidates);
  let turnCursor = 0;
  let previousTrackId: string | null = null;
  while (activeTracks.length > 0) {
    const turn = pickTrackTurn(turns, turnCursor, activeTracks, previousTrackId);
    turnCursor = turn.nextCursor;
    if (!turn.candidate) break;
    const candidate = turn.candidate;
    const before = candidate.remainingMinutes;
    if (placeCandidate(candidate)) {
      previousTrackId = candidate.trackId ?? null;
      if (candidate.remainingMinutes <= 0) {
        activeTracks.splice(activeTracks.indexOf(candidate), 1);
      }
    } else {
      candidate.remainingMinutes = before;
      addDropped(
        dropped,
        candidate,
        candidate.remainingMinutes < candidate.minSessionMinutes
          ? 'below-minimum'
          : budgetRemaining < candidate.minSessionMinutes + input.settings.breakMinutes
            ? 'overbooked'
            : 'no-gap'
      );
      activeTracks.splice(activeTracks.indexOf(candidate), 1);
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
    if (entry.source !== 'planner' || entry.status !== 'pending' || entry.locked) return false;
    const start = entry.startTime ? parseTimeToMinutes(entry.startTime) : null;
    const isFuture = mode === 'from-now' ? start !== null && start >= nowMinute : start !== null && !(start < nowMinute);
    return isFuture;
  }).map((entry) => entry.id);
}

export function dispatchGenerationMode<T>(params: {
  engineEnabled: boolean;
  planner: () => T;
  legacy: () => T;
}): T {
  return params.engineEnabled ? params.planner() : params.legacy();
}

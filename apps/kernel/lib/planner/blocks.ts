import type {
  FreeGap,
  PlannerBlock,
  PlannerCommitmentRow,
  PlannerOverlapWarning,
  PlannerSettings,
  PrayerTimes,
} from '@/lib/planner/types';
import { parseTimeToMinutes, weekdayForDate } from '@/lib/planner/time';

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

function daySegments(
  block: Omit<PlannerBlock, 'startMinute' | 'endMinute'>,
  startMinute: number,
  endMinute: number
): PlannerBlock[] {
  const start = Math.max(0, startMinute);
  const end = Math.min(1440, endMinute);
  return end > start ? [{ ...block, startMinute: start, endMinute: end }] : [];
}

function prayerBlocks(
  settings: PlannerSettings,
  prayers: PrayerTimes,
  isFriday: boolean
): PlannerBlock[] {
  return PRAYERS.flatMap((name) => {
    const time = parseTimeToMinutes(prayers[name]);
    if (time === null) return [];
    const duration = name === 'dhuhr' && isFriday
      ? settings.jumuahBlockMinutes
      : settings.prayerBlockMinutes;
    return daySegments(
      { id: `prayer-${name}`, title: name[0].toUpperCase() + name.slice(1), kind: 'prayer', prayer: name },
      time - settings.prayerBufferBeforeMinutes,
      time + duration
    );
  });
}

function commitmentApplies(
  commitment: PlannerCommitmentRow,
  date: string,
  weekday: number,
  cancelledIds: ReadonlySet<string>
): boolean {
  if (!commitment.active || cancelledIds.has(commitment.id)) return false;
  if (commitment.validFrom && date < commitment.validFrom) return false;
  if (commitment.validTo && date > commitment.validTo) return false;
  return commitment.date ? commitment.date === date : commitment.weekday === weekday;
}

export function commitmentsForDate(
  date: string,
  commitments: PlannerCommitmentRow[],
  cancelledIds: ReadonlySet<string> = new Set<string>()
) {
  const weekday = weekdayForDate(date);
  return commitments
    .filter((commitment) => commitment.active)
    .filter((commitment) => {
      if (commitment.validFrom && date < commitment.validFrom) return false;
      if (commitment.validTo && date > commitment.validTo) return false;
      return commitment.date ? commitment.date === date : commitment.weekday === weekday;
    })
    .map((commitment) => ({
      commitment,
      cancelled: cancelledIds.has(commitment.id),
    }));
}

function commitmentBlocks(
  date: string,
  commitments: PlannerCommitmentRow[],
  cancelledIds: ReadonlySet<string>
): PlannerBlock[] {
  return commitments.flatMap((commitment) => {
    if (!commitmentApplies(commitment, date, weekdayForDate(date), cancelledIds)) return [];
    const start = parseTimeToMinutes(commitment.startTime);
    const end = parseTimeToMinutes(commitment.endTime);
    if (start === null || end === null || end <= start) return [];
    return [{
      id: `commitment-${commitment.id}`,
      title: commitment.title,
      kind: 'commitment' as const,
      commitmentId: commitment.id,
      startMinute: start,
      endMinute: end,
    }];
  });
}

function sleepBlocks(settings: PlannerSettings): PlannerBlock[] {
  const wake = parseTimeToMinutes(settings.wakeTime);
  const sleep = parseTimeToMinutes(settings.sleepTime);
  if (wake === null || sleep === null || sleep === wake) return [];
  if (sleep < wake) {
    return daySegments(
      { id: 'sleep-daytime', title: 'Sleep', kind: 'sleep' },
      sleep,
      wake
    );
  }
  return [
    ...daySegments(
      { id: 'sleep-overnight', title: 'Sleep', kind: 'sleep' },
      0,
      wake
    ),
    ...daySegments(
      { id: 'sleep-bedtime', title: 'Sleep', kind: 'sleep' },
      sleep,
      1440
    ),
  ];
}

export function buildFixedBlocks(params: {
  date: string;
  settings: PlannerSettings;
  prayers: PrayerTimes;
  commitments: PlannerCommitmentRow[];
  cancelledCommitmentIds?: ReadonlySet<string>;
}): PlannerBlock[] {
  const isFriday = weekdayForDate(params.date) === 5;
  const blocks = [
    ...prayerBlocks(params.settings, params.prayers, isFriday),
    ...commitmentBlocks(
      params.date,
      params.commitments,
      params.cancelledCommitmentIds ?? new Set<string>()
    ),
    ...sleepBlocks(params.settings),
  ];
  return blocks.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
}

export function findOverlaps(blocks: PlannerBlock[]): PlannerOverlapWarning[] {
  const warnings: PlannerOverlapWarning[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const first = blocks[i];
      const second = blocks[j];
      const relevantPair =
        (first.kind === 'commitment' && second.kind === 'commitment') ||
        (first.kind === 'commitment' && second.kind === 'prayer') ||
        (first.kind === 'prayer' && second.kind === 'commitment');
      if (
        relevantPair &&
        first.startMinute < second.endMinute &&
        second.startMinute < first.endMinute
      ) {
        warnings.push({
          firstBlockId: first.id,
          secondBlockId: second.id,
          message: `${first.title} overlaps ${second.title}`,
        });
      }
    }
  }
  return warnings;
}

export function computeFreeGaps(
  blocks: PlannerBlock[],
  dayStart = 0,
  dayEnd = 1440
): FreeGap[] {
  if (!Number.isFinite(dayStart) || !Number.isFinite(dayEnd) || dayEnd <= dayStart) return [];
  const occupied = blocks
    .map((block) => ({
      start: Math.max(dayStart, block.startMinute),
      end: Math.min(dayEnd, block.endMinute),
    }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const gaps: FreeGap[] = [];
  let cursor = dayStart;
  for (const block of occupied) {
    if (block.start > cursor) {
      gaps.push({ startMinute: cursor, endMinute: block.start, minutes: block.start - cursor });
    }
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < dayEnd) {
    gaps.push({ startMinute: cursor, endMinute: dayEnd, minutes: dayEnd - cursor });
  }
  return gaps;
}

export function buildTodayTimeline(params: {
  date: string;
  settings: PlannerSettings;
  prayers: PrayerTimes;
  commitments: PlannerCommitmentRow[];
  cancelledCommitmentIds?: ReadonlySet<string>;
}) {
  const blocks = buildFixedBlocks(params);
  return {
    date: params.date,
    blocks,
    gaps: computeFreeGaps(blocks),
    warnings: findOverlaps(blocks),
  };
}

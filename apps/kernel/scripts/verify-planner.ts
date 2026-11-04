import assert from 'node:assert/strict';
import {
  buildFixedBlocks,
  computeFreeGaps,
  findOverlaps,
} from '@/lib/planner/blocks';
import { resolvePrayerTimes } from '@/lib/planner/prayer';
import {
  DEFAULT_PLANNER_SETTINGS,
  type PlannerCommitmentRow,
  type PlannerSettings,
  type PrayerTimes,
} from '@/lib/planner/types';

async function main() {
const date = '2026-11-06';
const settings: PlannerSettings = {
  ...DEFAULT_PLANNER_SETTINGS,
  userId: '',
  wakeTime: '05:00',
  sleepTime: '23:00',
};
const prayerTimes: PrayerTimes = {
  fajr: '05:20',
  dhuhr: '12:00',
  asr: '15:30',
  maghrib: '18:00',
  isha: '19:30',
};

function commitment(
  id: string,
  values: Partial<PlannerCommitmentRow> = {}
): PlannerCommitmentRow {
  return {
    id,
    userId: '',
    title: id,
    kind: 'lecture',
    weekday: 5,
    date: null,
    startTime: '11:40',
    endTime: '12:10',
    validFrom: null,
    validTo: null,
    location: null,
    notes: null,
    active: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...values,
  };
}

const blocks = buildFixedBlocks({
  date,
  settings,
  prayers: prayerTimes,
  commitments: [
    commitment('lecture-a', {
      title: 'Lecture A',
      startTime: '10:00',
      endTime: '11:45',
      validFrom: '2026-11-01',
      validTo: '2026-11-30',
    }),
    commitment('work-overlap', {
      kind: 'work',
      title: 'Work overlap',
      startTime: '11:30',
      endTime: '12:20',
    }),
    commitment('cancelled-lecture', { title: 'Cancelled lecture' }),
    commitment('not-started', { validFrom: '2026-11-07' }),
    commitment('expired', { validTo: '2026-11-05' }),
  ],
  cancelledCommitmentIds: new Set(['cancelled-lecture']),
});

assert(blocks.some((block) => block.commitmentId === 'lecture-a'), 'valid range includes occurrence');
assert(!blocks.some((block) => block.commitmentId === 'not-started'), 'valid_from excludes early occurrence');
assert(!blocks.some((block) => block.commitmentId === 'expired'), 'valid_to excludes late occurrence');
assert(!blocks.some((block) => block.commitmentId === 'cancelled-lecture'), 'cancelled occurrence is omitted');
assert(findOverlaps(blocks).some((warning) => warning.firstBlockId.includes('lecture-a') ||
  warning.secondBlockId.includes('lecture-a')), 'overlapping commitments produce warnings');
assert(findOverlaps(blocks).some((warning) =>
  warning.firstBlockId === 'prayer-dhuhr' || warning.secondBlockId === 'prayer-dhuhr'
), 'commitment/prayer overlap produces a warning');

const dhuhr = blocks.find((block) => block.id === 'prayer-dhuhr');
assert(dhuhr);
assert.equal(dhuhr.endMinute - 12 * 60, settings.jumuahBlockMinutes, 'Friday Dhuhr uses Jumuah duration');

const sleep = blocks.filter((block) => block.kind === 'sleep');
assert.deepEqual(
  sleep.map(({ startMinute, endMinute }) => [startMinute, endMinute]),
  [[0, 300], [1380, 1440]],
  'overnight sleep is clipped into today at midnight'
);

assert.deepEqual(
  computeFreeGaps([
    { id: 'early', title: 'Early', kind: 'commitment', startMinute: 60, endMinute: 120 },
    { id: 'late', title: 'Late', kind: 'commitment', startMinute: 1380, endMinute: 1500 },
  ]),
  [
    { startMinute: 0, endMinute: 60, minutes: 60 },
    { startMinute: 120, endMinute: 1380, minutes: 1260 },
  ],
  'gap computation clips blocks across the day boundary'
);

const manualPrayerTimes: PrayerTimes = {
  fajr: '05:10',
  dhuhr: '12:10',
  asr: '15:40',
  maghrib: '18:10',
  isha: '19:40',
};
const autoSettings: PlannerSettings = {
  ...settings,
  prayerAuto: true,
  prayerCity: 'Test City',
  prayerCountry: 'Test Country',
};
const mockedNetworkCalls: string[] = [];
const manualFallback = await resolvePrayerTimes({
  settings: autoSettings,
  cached: null,
  manual: manualPrayerTimes,
}, async () => {
  mockedNetworkCalls.push('aladhan');
  throw new Error('mocked network failure');
});
assert.equal(manualFallback.source, 'manual', 'network failure falls back to manual times');
assert.deepEqual(mockedNetworkCalls, ['aladhan'], 'automatic source is attempted before fallback');

const defaultFallback = await resolvePrayerTimes({
  settings: autoSettings,
  cached: null,
  manual: null,
}, async () => {
  mockedNetworkCalls.push('aladhan');
  throw new Error('mocked network failure');
});
assert.equal(defaultFallback.source, 'default', 'missing manual times fall back to defaults');
assert.deepEqual(mockedNetworkCalls, ['aladhan', 'aladhan']);

console.log('Planner foundation verification passed: overlaps, cancellation, validity, Friday Dhuhr, gaps, sleep, and prayer fallback.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

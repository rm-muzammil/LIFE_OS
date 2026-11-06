import {
  buildPlannerPlan,
  type PlannerEngineInput,
} from '@/lib/planner/engine';

const settings = {
  wakeTime: '05:00',
  sleepTime: '23:00',
  breakMinutes: 5,
  minSessionMinutes: 25,
  slackPercent: 0,
  defaultTaskMinutes: 30,
  preferredSessionMinutes: 45,
  weekStart: 1,
  stretchEnabled: false,
  stretchCapPercent: 150,
  maxDailyFocusMinutes: 300,
};

const tracks = [
  { id: 'docker', title: 'Docker', weeklyTargetMinutes: 300, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'medium' as const },
  { id: 'dsa', title: 'DSA', weeklyTargetMinutes: 420, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'high' as const },
  { id: 'arabic', title: 'Arabic', weeklyTargetMinutes: 150, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'medium' as const },
  { id: 'german', title: 'German', weeklyTargetMinutes: 150, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'medium' as const },
  { id: 'linkedin', title: 'LinkedIn', weeklyTargetMinutes: 60, minSessionMinutes: 25, maxSessionMinutes: 45, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'low' as const },
];

const progress = {
  docker: 120,
  dsa: 200,
  arabic: 40,
  german: 38,
  linkedin: 30,
};

type FixedBlock = PlannerEngineInput['fixedBlocks'][number];

function block(id: string, title: string, startMinute: number, endMinute: number): FixedBlock {
  return { id, title, kind: 'commitment', startMinute, endMinute };
}

const tuesdayBlocks = [
  block('lecture-1-travel', 'Lecture 09:00-11:00 + travel', 8 * 60 + 30, 11 * 60 + 30),
  block('lunch-tuesday', 'Lunch', 12 * 60, 12 * 60 + 45),
  block('lecture-2-travel', 'Lecture 14:00-15:30 + travel', 13 * 60 + 30, 16 * 60),
  block('dinner-tuesday', 'Dinner', 20 * 60, 20 * 60 + 45),
];

const saturdayBlocks = [
  block('lunch-saturday', 'Lunch', 13 * 60 + 30, 14 * 60 + 15),
  block('dinner-saturday', 'Dinner', 20 * 60, 20 * 60 + 45),
];

function makeInput(params: {
  date: string;
  blocks?: FixedBlock[];
  stretchEnabled: boolean;
  trackMinutesDone?: Readonly<Record<string, number>>;
  maxDailyFocusMinutes?: number;
  stretchCapPercent?: number;
}): PlannerEngineInput {
  return {
    date: params.date,
    nowMinute: 5 * 60,
    settings: {
      ...settings,
      stretchEnabled: params.stretchEnabled,
      maxDailyFocusMinutes: params.maxDailyFocusMinutes ?? settings.maxDailyFocusMinutes,
      stretchCapPercent: params.stretchCapPercent ?? settings.stretchCapPercent,
    },
    fixedBlocks: params.blocks ?? [],
    roadmapTasks: [],
    tracks,
    trackMinutesDone: params.trackMinutesDone ?? {},
  };
}

function remainingLabel(target: number, done: number, scheduled: number): string {
  const remaining = target - done - scheduled;
  if (remaining === 0) return 'met';
  if (remaining < 0) return `+${Math.abs(remaining)} over target`;
  return `${remaining} minutes`;
}

function printPlan(
  label: string,
  input: PlannerEngineInput,
  printRemainders = false
) {
  const result = buildPlannerPlan(input);
  const rows = result.sessions.map((session) => ({
    start: session.startTime,
    end: session.endTime,
    kind: session.extra ? 'track (extra)' : session.kind,
    title: session.title,
    minutes: session.plannedMinutes,
  }));
  const widths = {
    start: Math.max(5, ...rows.map((row) => row.start.length)),
    end: Math.max(5, ...rows.map((row) => row.end.length)),
    kind: Math.max(4, ...rows.map((row) => row.kind.length)),
    title: Math.max(5, ...rows.map((row) => row.title.length)),
    minutes: 7,
  };
  const line = `+${'-'.repeat(widths.start + 2)}+${'-'.repeat(widths.end + 2)}+${'-'.repeat(widths.kind + 2)}+${'-'.repeat(widths.title + 2)}+${'-'.repeat(widths.minutes + 2)}+`;
  const printRow = (values: Record<keyof typeof widths, string>) =>
    `| ${values.start.padEnd(widths.start)} | ${values.end.padEnd(widths.end)} | ${values.kind.padEnd(widths.kind)} | ${values.title.padEnd(widths.title)} | ${values.minutes.padStart(widths.minutes)} |`;

  console.log(`\n${label} — stretch ${input.settings.stretchEnabled ? 'on' : 'off'}`);
  console.log(`Daily focus cap: ${input.settings.maxDailyFocusMinutes} minutes`);
  console.log(`Per-track stretch cap: ${input.settings.stretchCapPercent}%`);
  console.log('Protected blocks:');
  if (input.fixedBlocks.length === 0) console.log('  (none)');
  for (const fixed of input.fixedBlocks) {
    const start = `${String(Math.floor(fixed.startMinute / 60)).padStart(2, '0')}:${String(fixed.startMinute % 60).padStart(2, '0')}`;
    const end = `${String(Math.floor(fixed.endMinute / 60)).padStart(2, '0')}:${String(fixed.endMinute % 60).padStart(2, '0')}`;
    console.log(`  - ${start}-${end} ${fixed.title}`);
  }
  console.log(line);
  console.log(printRow({ start: 'start', end: 'end', kind: 'kind', title: 'title', minutes: 'minutes' }));
  console.log(line);
  for (const row of rows) {
    console.log(printRow({
      start: row.start,
      end: row.end,
      kind: row.kind,
      title: row.title,
      minutes: String(row.minutes),
    }));
  }
  console.log(line);
  console.log(`Total focus minutes per day: ${result.sessions.reduce((sum, session) => sum + session.plannedMinutes, 0)}`);
  console.log('Warnings:');
  if (result.warnings.length === 0) console.log('  (none)');
  for (const warning of result.warnings) console.log(`  - ${warning}`);
  console.log('Dropped:');
  if (result.dropped.length === 0) console.log('  (none)');
  for (const item of result.dropped) {
    console.log(`  - ${item.title}: ${item.reason} (${item.remainingMinutes} minutes)`);
  }
  if (printRemainders) {
    console.log('Remaining weekly minutes after progress and today’s scheduled sessions:');
    for (const track of tracks) {
      const scheduled = result.sessions
        .filter((session) => session.trackId === track.id)
        .reduce((total, session) => total + session.plannedMinutes, 0);
      console.log(`  ${track.title}: ${remainingLabel(
        track.weeklyTargetMinutes,
        input.trackMinutesDone[track.id] ?? 0,
        scheduled
      )}`);
    }
  }
}

for (const stretchEnabled of [false, true]) {
  printPlan(
    'Tuesday 2024-01-02 (lectures with 30-minute travel buffers, lunch, dinner)',
    makeInput({ date: '2024-01-02', blocks: tuesdayBlocks, stretchEnabled })
  );
  printPlan(
    'Thursday 2024-01-04 (mid-week progress: Docker 120, DSA 200, Arabic 40, German 38, LinkedIn 30)',
    makeInput({
      date: '2024-01-04',
      stretchEnabled,
      trackMinutesDone: progress,
      maxDailyFocusMinutes: 720,
      stretchCapPercent: 300,
    }),
    true
  );
}

printPlan(
  'Saturday 2024-01-06 (no lectures, lunch, dinner)',
  makeInput({ date: '2024-01-06', blocks: saturdayBlocks, stretchEnabled: true })
);

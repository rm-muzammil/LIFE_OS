import {
  buildPlannerPlan,
  type PlannerEngineInput,
} from '@/lib/planner/engine';

const settings = {
  wakeTime: '05:00',
  sleepTime: '23:00',
  breakMinutes: 5,
  minSessionMinutes: 25,
  slackPercent: 15,
  defaultTaskMinutes: 30,
  preferredSessionMinutes: 45,
  weekStart: 1,
  stretchEnabled: false,
};

const tracks = [
  { id: 'docker', title: 'Docker', weeklyTargetMinutes: 300, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'medium' as const },
  { id: 'dsa', title: 'DSA', weeklyTargetMinutes: 420, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'high' as const },
  { id: 'arabic', title: 'Arabic', weeklyTargetMinutes: 150, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'medium' as const },
  { id: 'german', title: 'German', weeklyTargetMinutes: 150, minSessionMinutes: 25, maxSessionMinutes: 90, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'medium' as const },
  { id: 'linkedin', title: 'LinkedIn', weeklyTargetMinutes: 60, minSessionMinutes: 25, maxSessionMinutes: 45, maxPerDayMinutes: 90, preferredWindow: 'any' as const, allowedWeekdays: 127, priority: 'low' as const },
];

const tasks = [
  { id: 'overdue-task', title: 'Finish overdue report', dueDate: '2024-01-01', estimateMinutes: 30, priority: 2 },
  { id: 'due-task', title: 'Prepare project submission', dueDate: '2024-01-02', estimateMinutes: 60, priority: 1 },
];

function fixedPrayerBlocks(friday: boolean) {
  return [
    { title: 'Fajr', minute: 5 * 60 + 30, duration: 20 },
    { title: 'Dhuhr', minute: 12 * 60 + 15, duration: friday ? 90 : 20 },
    { title: 'Asr', minute: 15 * 60 + 30, duration: 20 },
    { title: 'Maghrib', minute: 17 * 60 + 45, duration: 20 },
    { title: 'Isha', minute: 19 * 60, duration: 20 },
  ].map(({ title, minute, duration }, index) => ({
    id: `prayer-${index}`,
    title,
    kind: 'prayer' as const,
    startMinute: minute - 10,
    endMinute: minute + duration,
  }));
}

function makeInput(date: string, lectures: boolean, friday: boolean, stretchEnabled: boolean): PlannerEngineInput {
  const taskDueToday = { ...tasks[1], dueDate: date };
  return {
    date,
    nowMinute: 300,
    settings: { ...settings, stretchEnabled },
    fixedBlocks: [
      ...fixedPrayerBlocks(friday),
      ...(lectures ? [
        { id: 'lecture-1', title: 'Lecture', kind: 'commitment' as const, startMinute: 540, endMinute: 660 },
        { id: 'lecture-2', title: 'Lecture', kind: 'commitment' as const, startMinute: 840, endMinute: 930 },
      ] : []),
    ],
    roadmapTasks: [tasks[0], taskDueToday],
    tracks,
    trackMinutesDone: {},
  };
}

function printPlan(label: string, input: PlannerEngineInput, printRemainders = false) {
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
  console.log('Dropped:');
  if (result.dropped.length === 0) console.log('  (none)');
  for (const item of result.dropped) {
    console.log(`  - ${item.title}: ${item.reason} (${item.remainingMinutes} minutes)`);
  }
  if (printRemainders) {
    console.log('Track weekly minutes remaining after today’s scheduled sessions:');
    for (const track of tracks) {
      const planned = result.sessions
        .filter((session) => session.trackId === track.id)
        .reduce((total, session) => total + session.plannedMinutes, 0);
      console.log(`  ${track.title}: ${Math.max(0, track.weeklyTargetMinutes - planned)}`);
    }
  }
}

for (const stretchEnabled of [false, true]) {
  printPlan(
    'Tuesday 2024-01-02 (lectures 09:00-11:00, 14:00-15:30)',
    makeInput('2024-01-02', true, false, stretchEnabled),
    true
  );
  printPlan(
    'Saturday 2024-01-06 (no lectures)',
    makeInput('2024-01-06', false, false, stretchEnabled)
  );
  printPlan(
    'Friday 2024-01-05 (Jumu’ah block)',
    makeInput('2024-01-05', true, true, stretchEnabled)
  );
}

import type { Province } from '@/db/schema';
import { isFromToday } from '@/lib/time';
import type {
  ProvinceContext,
  ScheduledTask,
  PrayerTimesConfig,
  TaskProvince,
} from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// Province context — reads only from provinces.cachedDetails,
// which is refreshed once/day by app/api/cron/pull-provinces.
// The scheduler never talks to province apps directly.
//
// If a province's cachedAt isn't from today (PKT), its pull hasn't
// succeeded yet today — treat todayDone as false (unknown = assume
// not done) rather than silently reusing yesterday's true/done flags.
// This makes the prompt correct even if pull-provinces hasn't run yet
// or failed, without requiring the two crons to fire in a guaranteed order.
// ─────────────────────────────────────────────────────────────
export function buildProvinceContext(rows: Province[]): ProvinceContext[] {
  return rows.map((p) => {
    const details = (p.cachedDetails ?? {}) as Record<string, unknown>;
    const stale = !isFromToday(p.cachedAt);
    return {
      slug: p.slug,
      name: p.name,
      cachedScore: p.cachedScore,
      todayDone: stale ? false : typeof details.todayDone === 'boolean' ? details.todayDone : false,
      streak: typeof details.streak === 'number' ? details.streak : 0,
      details,
      stale,
    };
  });
}

function ctx(contexts: ProvinceContext[], slug: string): ProvinceContext | undefined {
  return contexts.find((c) => c.slug === slug);
}

function flag(details: Record<string, unknown> | undefined, key: string): boolean {
  return Boolean(details?.[key]);
}

function num(details: Record<string, unknown> | undefined, key: string): number {
  const v = details?.[key];
  return typeof v === 'number' ? v : 0;
}

export interface TaskHint {
  province: TaskProvince;
  label: string;
  reason: string; // why this is pending — helps Gemini place it sensibly
}

/**
 * Deterministic "what's still pending" extraction per province, per the
 * rules in the SK scheduler spec. This is NOT the final schedule — it's
 * context handed to Gemini so it doesn't have to guess what's outstanding.
 * Prayers themselves are NOT included here; they're fixed anchors passed
 * separately via prayerTimes.
 */
export function extractPendingTaskHints(
  contexts: ProvinceContext[],
  opts: { isFriday: boolean; isFastDay: boolean }
): TaskHint[] {
  const hints: TaskHint[] = [];

  const faith = ctx(contexts, 'faith')?.details;
  if (faith) {
    if (!flag(faith, 'tafseerDone')) {
      hints.push({ province: 'faith', label: 'Raku session (tafseer + tajweed + vocab)', reason: 'not done today' });
    }
    if (!flag(faith, 'verseDone')) {
      hints.push({ province: 'faith', label: 'Daily verse memorization', reason: 'not done today' });
    }
    if (!flag(faith, 'mulkDone')) {
      hints.push({ province: 'faith', label: 'Surah Al-Mulk', reason: 'read before Isha/sleep' });
    }
    if (opts.isFriday && !flag(faith, 'surahKahf')) {
      hints.push({ province: 'faith', label: 'Surah Al-Kahf', reason: 'Friday, not done yet' });
    }
    if (!flag(faith, 'dhikrDone')) {
      hints.push({ province: 'faith', label: 'La ilaha illallah x100 + Subhanallahi x100', reason: 'not done today' });
    }
    if (num(faith, 'islamicStudyMinutes') < 15) {
      hints.push({ province: 'faith', label: 'Islamic study', reason: 'under 15min today' });
    }
  }

  const personal = ctx(contexts, 'personal')?.details;
  if (personal) {
    if (!opts.isFastDay && !flag(personal, 'workoutDone')) {
      hints.push({ province: 'personal', label: 'Workout session', reason: 'not done, not a rest/fast day' });
    }
    if (num(personal, 'calories') === 0) {
      hints.push({ province: 'personal', label: 'Log calories / protein target', reason: 'nothing logged today' });
    }
  }

  const roadmap = ctx(contexts, 'roadmap')?.details;
  if (roadmap) {
    const todayTotal = num(roadmap, 'todayTotal');
    if (todayTotal > 0) {
      hints.push({ province: 'roadmap', label: `${todayTotal} roadmap task(s) due today`, reason: 'incomplete' });
    }
  }

  const wealth = ctx(contexts, 'wealth')?.details;
  if (wealth) {
    if (!flag(wealth, 'loggedToday')) {
      hints.push({ province: 'wealth', label: 'Log income/expense transactions', reason: 'nothing logged today' });
    }
    if (num(wealth, 'activeGoals') > 0) {
      hints.push({ province: 'wealth', label: 'Check goal progress', reason: 'active goals exist' });
    }
  }

  const relationships = ctx(contexts, 'relationships')?.details;
  if (relationships) {
    if (!flag(relationships, 'contactedParents')) {
      hints.push({ province: 'relationships', label: 'Call parents', reason: 'not contacted today' });
    }
  }

  const work = ctx(contexts, 'work')?.details;
  if (work) {
    if (num(work, 'deepWorkHours') === 0) {
      hints.push({ province: 'work', label: 'Deep work block', reason: 'none logged today' });
    }
    if (num(work, 'tasksCompleted') === 0) {
      hints.push({ province: 'work', label: 'Complete work tasks', reason: 'none completed today' });
    }
    if (num(work, 'profDevMinutes') === 0) {
      hints.push({ province: 'work', label: 'Professional development', reason: 'none today' });
    }
  }

  if (opts.isFriday) {
    hints.push({ province: 'sk', label: 'Weekly review', reason: 'Friday, if not done this week' });
    hints.push({ province: 'sk', label: 'Character ratings', reason: 'Friday, if not done this week' });
  }
  hints.push({ province: 'sk', label: 'Hadith reflection', reason: 'if none logged this week' });

  return hints;
}

// ─────────────────────────────────────────────────────────────
// Gemini prompt builder
// ─────────────────────────────────────────────────────────────
export function buildSchedulerPrompt(params: {
  date: string;
  dayName: string;
  isFriday: boolean;
  isFastDay: boolean;
  prayerTimes: PrayerTimesConfig;
  provinceContext: ProvinceContext[];
  extractedTasks: TaskHint[];
  chatNotes: string;
}): string {
  const { date, dayName, isFriday, isFastDay, prayerTimes, provinceContext, extractedTasks, chatNotes } = params;

  return `You are a personal life scheduler for a Muslim man in Pakistan.
Generate a structured daily schedule as a JSON array of tasks.

TODAY: ${date} (${dayName}) PKT
IS_FRIDAY: ${isFriday}
IS_FAST_DAY: ${isFastDay} (Monday/Thursday — fasting Sunnah)

PRAYER TIMES (PKT):
Fajr: ${prayerTimes.fajr}, Dhuhr: ${prayerTimes.dhuhr}, Asr: ${prayerTimes.asr}, Maghrib: ${prayerTimes.maghrib}, Isha: ${prayerTimes.isha}

PROVINCE SCORES & STATUS:
${JSON.stringify(provinceContext)}

PENDING TASKS EXTRACTED:
${JSON.stringify(extractedTasks)}

CHAT NOTES FROM USER (last 7 days):
${chatNotes || '(none)'}

Each task object in your output MUST have exactly these fields:
{
  "id": string (uuid-like random string),
  "time": "HH:MM" 24h PKT,
  "timeLabel": string (e.g. "Fajr", "Before Dhuhr", "After Asr"),
  "province": one of "faith"|"personal"|"work"|"roadmap"|"wealth"|"relationships"|"sk",
  "title": string,
  "description": string (short),
  "priority": number (1 = highest),
  "type": one of "prayer"|"sunnah"|"task"|"review"|"deep-work",
  "status": "pending",
  "originalTime": null,
  "visibleAfter": "HH:MM" PKT — task should not appear before this time,
  "hideAfter": "HH:MM" PKT or null — null means never auto-hide,
  "notifyAt": "HH:MM" PKT — when to fire a notification
}

RULES:
- Prayers are fixed anchors — never move them. Include all 5 prayers as tasks with type="prayer".
- Prayer hideAfter: Fajr hides after Dhuhr time, Dhuhr hides after Asr time, Asr hides after Maghrib time, Maghrib hides after Isha time, Isha hides after midnight (23:59).
- Schedule non-prayer tasks in the windows between prayers.
- Low-score provinces get more tasks / higher priority.
- Fast days: no workout task; add a fasting reminder instead.
- Friday: include Surah Al-Kahf, a Jumu'ah reminder, and (if pending) weekly review + character ratings.
- Return ONLY a valid JSON array of task objects — no markdown, no explanation, no surrounding text.`;
}

// ─────────────────────────────────────────────────────────────
// Visibility rules
// ─────────────────────────────────────────────────────────────
const PRAYER_HIDE_AFTER: Record<string, keyof PrayerTimesConfig | '23:59'> = {
  Fajr: 'dhuhr',
  Dhuhr: 'asr',
  Asr: 'maghrib',
  Maghrib: 'isha',
  Isha: '23:59',
};

/** Resolves a task's hideAfter time for prayer tasks against configured prayer times. */
export function resolvePrayerHideAfter(timeLabel: string, prayerTimes: PrayerTimesConfig): string | null {
  const rule = PRAYER_HIDE_AFTER[timeLabel];
  if (!rule) return null;
  return rule === '23:59' ? '23:59' : prayerTimes[rule];
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export interface VisibleTasksResult {
  visible: ScheduledTask[]; // current + next 2 (max 3), non-prayer + non-missed
  missed: ScheduledTask[]; // missed prayers/tasks — shown separately, never occupy a visible slot
  upcoming: ScheduledTask[]; // everything else not yet visible
  done: ScheduledTask[];
}

/**
 * Splits a day's tasks into visible/missed/upcoming/done per the spec's
 * visibility rules. Missed tasks are deliberately excluded from the
 * "max 3 visible" queue so a missed prayer can never block the day.
 */
export function computeVisibleTasks(tasks: ScheduledTask[], nowPKT: Date): VisibleTasksResult {
  const nowMinutes = nowPKT.getHours() * 60 + nowPKT.getMinutes();

  const missed = tasks.filter((t) => t.status === 'missed');
  const done = tasks.filter((t) => t.status === 'done');

  const eligible = tasks
    .filter((t) => t.status === 'pending' || t.status === 'rescheduled')
    .filter((t) => toMinutes(t.visibleAfter) <= nowMinutes)
    .filter((t) => (t.hideAfter ? toMinutes(t.hideAfter) > nowMinutes : true))
    .sort((a, b) => a.priority - b.priority || toMinutes(a.time) - toMinutes(b.time));

  const visible = eligible.slice(0, 3);
  const upcoming = tasks.filter(
    (t) =>
      (t.status === 'pending' || t.status === 'rescheduled') &&
      !visible.includes(t) &&
      toMinutes(t.visibleAfter) > nowMinutes
  );

  return { visible, missed, upcoming, done };
}

/** Marks a prayer task missed once its hideAfter window has passed uncompleted. Never reschedules prayers. */
export function sweepMissedPrayers(tasks: ScheduledTask[], nowPKT: Date): ScheduledTask[] {
  const nowMinutes = nowPKT.getHours() * 60 + nowPKT.getMinutes();
  return tasks.map((t) => {
    if (t.type === 'prayer' && t.status === 'pending' && t.hideAfter && toMinutes(t.hideAfter) <= nowMinutes) {
      return { ...t, status: 'missed' as const };
    }
    return t;
  });
}

/** Reschedules a missed non-prayer task to the next 15-minute slot from now. */
export function rescheduleTask(task: ScheduledTask, nowPKT: Date): ScheduledTask {
  const minutes = nowPKT.getHours() * 60 + nowPKT.getMinutes();
  const nextSlot = Math.ceil(minutes / 15) * 15;
  const h = Math.floor(nextSlot / 60) % 24;
  const m = nextSlot % 60;
  const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return {
    ...task,
    originalTime: task.originalTime ?? task.time,
    time: newTime,
    visibleAfter: newTime,
    status: 'rescheduled',
  };
}

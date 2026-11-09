import {
  DEFAULT_PLANNER_SETTINGS,
  type PlannerDomain,
  type PlannerKind,
  type PlannerPriority,
  type PreferredWindow,
} from '@/lib/planner/types';
import { isPlannerDate, parseTimeToMinutes } from '@/lib/planner/time';

type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export interface PlannerSettingsInput {
  wakeTime: string;
  sleepTime: string;
  prayerBlockMinutes: number;
  prayerBufferBeforeMinutes: number;
  jumuahBlockMinutes: number;
  breakMinutes: number;
  minSessionMinutes: number;
  prayerAuto: boolean;
  prayerCity: string | null;
  prayerCountry: string | null;
  prayerMethod: number;
  prayerAsrSchool: number;
  engineEnabled: boolean;
  weekStart: number;
  slackPercent: number;
  defaultTaskMinutes: number;
  preferredSessionMinutes: number;
  stretchEnabled: boolean;
  stretchCapPercent: number;
  maxDailyFocusMinutes: number;
}

export interface CommitmentInput {
  title: string;
  kind: PlannerKind;
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
}

export interface TrackInput {
  title: string;
  domain: PlannerDomain;
  weeklyTargetMinutes: number;
  minSessionMinutes: number;
  maxSessionMinutes: number;
  maxPerDayMinutes: number;
  preferredWindow: PreferredWindow;
  allowedWeekdays: number;
  priority: PlannerPriority;
  active: boolean;
  goalId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim();
}

function valid<T>(value: T): Validation<T> {
  return { ok: true, value };
}

function invalid<T>(error: string): Validation<T> {
  return { ok: false, error };
}

function parseText(
  value: unknown,
  field: string,
  maxLength: number,
  nullable = false
): Validation<string | null> {
  if (nullable && (value === null || value === '')) return valid(null);
  if (typeof value !== 'string') return invalid(`${field} must be text${nullable ? ' or null' : ''}`);
  const text = cleanText(value);
  if (!text && !nullable) return invalid(`${field} is required`);
  if (text.length > maxLength) return invalid(`${field} must be ${maxLength} characters or fewer`);
  return valid(text || null);
}

function parsePrayerLocation(value: unknown, field: 'prayerCity' | 'prayerCountry'): Validation<string | null> {
  if (value === null || value === '') return valid(null);
  if (typeof value !== 'string') return invalid(`${field} must be text or null`);
  if (/[\u0000-\u001f\u007f-\u009f]/.test(value)) {
    return invalid(`${field} must not contain control characters`);
  }
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    return invalid(`${field} must be 1 to 100 characters`);
  }
  return valid(trimmed);
}

function parseInteger(
  value: unknown,
  field: string,
  min: number,
  max: number
): Validation<number> {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
    ? valid(value)
    : invalid(`${field} must be a whole number between ${min} and ${max}`);
}

function parseNullableDate(value: unknown, field: string): Validation<string | null> {
  if (value === null || value === '') return valid(null);
  return isPlannerDate(value) ? valid(value) : invalid(`${field} must be a valid YYYY-MM-DD date or null`);
}

function parseTime(value: unknown, field: string): Validation<string> {
  return typeof value === 'string' && parseTimeToMinutes(value) !== null
    ? valid(value)
    : invalid(`${field} must be a valid HH:MM time`);
}

function isKind(value: unknown): value is PlannerKind {
  return value === 'lecture' || value === 'work' || value === 'other';
}

function isDomain(value: unknown): value is PlannerDomain {
  return value === 'faith' || value === 'personal' || value === 'wealth' ||
    value === 'relationships' || value === 'work' || value === 'learning' || value === 'other';
}

function isPriority(value: unknown): value is PlannerPriority {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isPreferredWindow(value: unknown): value is PreferredWindow {
  return value === 'morning' || value === 'afternoon' || value === 'evening' ||
    value === 'night' || value === 'any';
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseSettingsInput(body: unknown): Validation<Partial<PlannerSettingsInput>> {
  if (!isRecord(body)) return invalid('A valid request body is required');
  const value: Partial<PlannerSettingsInput> = {};
  const fields: Array<keyof PlannerSettingsInput> = [
    'wakeTime', 'sleepTime', 'prayerBlockMinutes', 'prayerBufferBeforeMinutes',
    'jumuahBlockMinutes', 'breakMinutes', 'minSessionMinutes', 'prayerAuto',
    'prayerCity', 'prayerCountry', 'prayerMethod', 'prayerAsrSchool',
    'engineEnabled', 'weekStart', 'slackPercent', 'defaultTaskMinutes',
    'preferredSessionMinutes', 'stretchEnabled', 'stretchCapPercent',
    'maxDailyFocusMinutes',
  ];
  if (!fields.some((field) => body[field] !== undefined)) {
    return invalid('At least one planner setting is required');
  }
  for (const field of fields) {
    const raw = body[field];
    if (raw === undefined) continue;
    if (field === 'wakeTime' || field === 'sleepTime') {
      const parsed = parseTime(raw, field);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'prayerBlockMinutes' || field === 'jumuahBlockMinutes') {
      const parsed = parseInteger(raw, field, 1, 360);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'prayerBufferBeforeMinutes' || field === 'breakMinutes') {
      const parsed = parseInteger(raw, field, 0, 180);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'minSessionMinutes') {
      const parsed = parseInteger(raw, field, 1, 1440);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'prayerMethod') {
      const parsed = parseInteger(raw, field, 0, 99);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'prayerAsrSchool') {
      const parsed = parseInteger(raw, field, 0, 1);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'weekStart') {
      const parsed = parseInteger(raw, field, 0, 6);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'slackPercent') {
      const parsed = parseInteger(raw, field, 0, 50);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'defaultTaskMinutes') {
      const parsed = parseInteger(raw, field, 5, 240);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'preferredSessionMinutes') {
      const parsed = parseInteger(raw, field, 10, 240);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'stretchCapPercent') {
      const parsed = parseInteger(raw, field, 100, 300);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'maxDailyFocusMinutes') {
      const parsed = parseInteger(raw, field, 60, 720);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    } else if (field === 'stretchEnabled') {
      if (typeof raw !== 'boolean') return invalid('stretchEnabled must be a boolean');
      value.stretchEnabled = raw;
    } else if (field === 'engineEnabled') {
      if (typeof raw !== 'boolean') return invalid('engineEnabled must be a boolean');
      value.engineEnabled = raw;
    } else if (field === 'prayerAuto') {
      if (typeof raw !== 'boolean') return invalid('prayerAuto must be a boolean');
      value.prayerAuto = raw;
    } else {
      const parsed = parsePrayerLocation(raw, field);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    }
  }
  return valid(value);
}

export function mergeAndValidateSettings(
  partial: Partial<PlannerSettingsInput>,
  current?: Partial<PlannerSettingsInput>
): Validation<PlannerSettingsInput> {
  const merged: PlannerSettingsInput = {
    wakeTime: current?.wakeTime ?? DEFAULT_PLANNER_SETTINGS.wakeTime,
    sleepTime: current?.sleepTime ?? DEFAULT_PLANNER_SETTINGS.sleepTime,
    prayerBlockMinutes: current?.prayerBlockMinutes ?? DEFAULT_PLANNER_SETTINGS.prayerBlockMinutes,
    prayerBufferBeforeMinutes: current?.prayerBufferBeforeMinutes ?? DEFAULT_PLANNER_SETTINGS.prayerBufferBeforeMinutes,
    jumuahBlockMinutes: current?.jumuahBlockMinutes ?? DEFAULT_PLANNER_SETTINGS.jumuahBlockMinutes,
    breakMinutes: current?.breakMinutes ?? DEFAULT_PLANNER_SETTINGS.breakMinutes,
    minSessionMinutes: current?.minSessionMinutes ?? DEFAULT_PLANNER_SETTINGS.minSessionMinutes,
    prayerAuto: current?.prayerAuto ?? DEFAULT_PLANNER_SETTINGS.prayerAuto,
    prayerCity: current?.prayerCity ?? DEFAULT_PLANNER_SETTINGS.prayerCity,
    prayerCountry: current?.prayerCountry ?? DEFAULT_PLANNER_SETTINGS.prayerCountry,
    prayerMethod: current?.prayerMethod ?? DEFAULT_PLANNER_SETTINGS.prayerMethod,
    prayerAsrSchool: current?.prayerAsrSchool ?? DEFAULT_PLANNER_SETTINGS.prayerAsrSchool,
    engineEnabled: current?.engineEnabled ?? DEFAULT_PLANNER_SETTINGS.engineEnabled,
    weekStart: current?.weekStart ?? DEFAULT_PLANNER_SETTINGS.weekStart,
    slackPercent: current?.slackPercent ?? DEFAULT_PLANNER_SETTINGS.slackPercent,
    defaultTaskMinutes: current?.defaultTaskMinutes ?? DEFAULT_PLANNER_SETTINGS.defaultTaskMinutes,
    preferredSessionMinutes: current?.preferredSessionMinutes ?? DEFAULT_PLANNER_SETTINGS.preferredSessionMinutes,
    stretchEnabled: current?.stretchEnabled ?? DEFAULT_PLANNER_SETTINGS.stretchEnabled,
    stretchCapPercent: current?.stretchCapPercent ?? DEFAULT_PLANNER_SETTINGS.stretchCapPercent,
    maxDailyFocusMinutes: current?.maxDailyFocusMinutes ?? DEFAULT_PLANNER_SETTINGS.maxDailyFocusMinutes,
    ...partial,
  };
  if (parseTimeToMinutes(merged.wakeTime) === parseTimeToMinutes(merged.sleepTime)) {
    return invalid('wakeTime and sleepTime must differ');
  }
  if (merged.prayerAuto && (!merged.prayerCity || !merged.prayerCountry)) {
    return invalid('prayerCity and prayerCountry are required when automatic prayer times are enabled');
  }
  return valid(merged);
}

export function parseCommitmentInput(
  body: unknown,
  partial = false
): Validation<Partial<CommitmentInput>> {
  if (!isRecord(body)) return invalid('A valid request body is required');
  const value: Partial<CommitmentInput> = {};
  if (!partial || body.title !== undefined) {
    const parsed = parseText(body.title, 'title', 120);
    if (!parsed.ok) return parsed;
    value.title = parsed.value!;
  }
  if (!partial || body.kind !== undefined) {
    if (!isKind(body.kind)) return invalid('kind must be lecture, work, or other');
    value.kind = body.kind;
  }
  if (!partial || body.weekday !== undefined) {
    if (!partial && body.weekday === undefined) {
      value.weekday = null;
    } else
    if (body.weekday === null) value.weekday = null;
    else {
      const parsed = parseInteger(body.weekday, 'weekday', 0, 6);
      if (!parsed.ok) return parsed;
      value.weekday = parsed.value;
    }
  }
  if (!partial || body.date !== undefined) {
    if (!partial && body.date === undefined) {
      value.date = null;
    } else {
      const parsed = parseNullableDate(body.date, 'date');
      if (!parsed.ok) return parsed;
      value.date = parsed.value;
    }
  }
  if (!partial || body.startTime !== undefined) {
    const parsed = parseTime(body.startTime, 'startTime');
    if (!parsed.ok) return parsed;
    value.startTime = parsed.value;
  }
  if (!partial || body.endTime !== undefined) {
    const parsed = parseTime(body.endTime, 'endTime');
    if (!parsed.ok) return parsed;
    value.endTime = parsed.value;
  }
  for (const field of ['bufferBeforeMinutes', 'bufferAfterMinutes'] as const) {
    if (!partial || body[field] !== undefined) {
      const parsed = parseInteger(body[field] ?? 0, field, 0, 180);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    }
  }
  for (const field of ['validFrom', 'validTo'] as const) {
    if (!partial || body[field] !== undefined) {
      if (!partial && body[field] === undefined) {
        value[field] = null;
      } else {
        const parsed = parseNullableDate(body[field], field);
        if (!parsed.ok) return parsed;
        value[field] = parsed.value;
      }
    }
  }
  for (const field of ['location', 'notes'] as const) {
    if (!partial || body[field] !== undefined) {
      if (!partial && body[field] === undefined) {
        value[field] = null;
      } else {
        const parsed = parseText(body[field], field, field === 'location' ? 200 : 2000, true);
        if (!parsed.ok) return parsed;
        value[field] = parsed.value;
      }
    }
  }
  if (!partial || body.active !== undefined) {
    if (!partial && body.active === undefined) value.active = true;
    else {
      if (typeof body.active !== 'boolean') return invalid('active must be a boolean');
      value.active = body.active;
    }
  }
  return valid(value);
}

export function validateCommitment(input: CommitmentInput): string | null {
  if ((input.weekday === null) === (input.date === null)) {
    return 'Exactly one of weekday or date must be set';
  }
  if (input.endTime <= input.startTime) {
    return 'Commitments cannot cross midnight; split this into two entries at midnight';
  }
  if (input.validFrom && input.validTo && input.validFrom > input.validTo) {
    return 'validFrom must not be after validTo';
  }
  return null;
}

export function commitmentBufferWarning(
  input: Pick<
    CommitmentInput,
    'startTime' | 'endTime' | 'bufferBeforeMinutes' | 'bufferAfterMinutes'
  >
): string | null {
  const start = parseTimeToMinutes(input.startTime);
  const end = parseTimeToMinutes(input.endTime);
  if (
    start === null ||
    end === null ||
    !Number.isSafeInteger(input.bufferBeforeMinutes) ||
    !Number.isSafeInteger(input.bufferAfterMinutes)
  ) {
    return null;
  }
  if (
    start - input.bufferBeforeMinutes < 0 ||
    end + input.bufferAfterMinutes >= 1440
  ) {
    return 'travel buffer extends past midnight; blocked time will be clamped to the day boundary';
  }
  return null;
}

export function parseTrackInput(body: unknown, partial = false): Validation<Partial<TrackInput>> {
  if (!isRecord(body)) return invalid('A valid request body is required');
  const value: Partial<TrackInput> = {};
  if (!partial || body.title !== undefined) {
    const parsed = parseText(body.title, 'title', 100);
    if (!parsed.ok) return parsed;
    value.title = parsed.value!;
  }
  if (!partial || body.domain !== undefined) {
    if (!isDomain(body.domain)) return invalid('domain must be a supported planner domain');
    value.domain = body.domain;
  }
  for (const [field, min, max] of [
    ['weeklyTargetMinutes', 0, 10080],
    ['minSessionMinutes', 1, 1440],
    ['maxSessionMinutes', 1, 1440],
    ['maxPerDayMinutes', 1, 1440],
    ['allowedWeekdays', 0, 127],
  ] as const) {
    if (!partial || body[field] !== undefined) {
      const parsed = parseInteger(body[field], field, min, max);
      if (!parsed.ok) return parsed;
      value[field] = parsed.value;
    }
  }
  if (!partial || body.preferredWindow !== undefined) {
    if (!isPreferredWindow(body.preferredWindow)) {
      return invalid('preferredWindow must be morning, afternoon, evening, night, or any');
    }
    value.preferredWindow = body.preferredWindow;
  }
  if (!partial || body.priority !== undefined) {
    if (!isPriority(body.priority)) return invalid('priority must be low, medium, or high');
    value.priority = body.priority;
  }
  if (!partial || body.active !== undefined) {
    if (typeof body.active !== 'boolean') return invalid('active must be a boolean');
    value.active = body.active;
  }
  if (!partial || body.goalId !== undefined) {
    if ((!partial && body.goalId === undefined) || body.goalId === null || body.goalId === '') {
      value.goalId = null;
    }
    else if (isUuid(body.goalId)) value.goalId = body.goalId;
    else return invalid('goalId must be a UUID or null');
  }
  if (partial && Object.keys(value).length === 0) return invalid('At least one track field is required');
  return valid(value);
}

export function validateTrack(input: TrackInput): string | null {
  if (
    input.minSessionMinutes > input.maxSessionMinutes ||
    input.maxSessionMinutes > input.maxPerDayMinutes
  ) {
    return 'Session limits must satisfy minSessionMinutes <= maxSessionMinutes <= maxPerDayMinutes';
  }
  return null;
}

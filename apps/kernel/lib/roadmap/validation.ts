import { isDateString } from '@/lib/faith/date';
import {
  cleanText,
  isGoalStatus,
  isRoadmapDomain,
  isRoadmapPriority,
  isTaskStatus,
} from '@/lib/roadmap/repo';
import type {
  RoadmapDomain,
  RoadmapGoalStatus,
  RoadmapPriority,
  RoadmapTaskStatus,
} from '@/lib/roadmap/types';

type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

function valid<T>(value: T): Validation<T> {
  return { ok: true, value };
}

function invalid<T>(error: string): Validation<T> {
  return { ok: false, error };
}

export interface GoalInput {
  title: string;
  description: string | null;
  domain: RoadmapDomain;
  priority: RoadmapPriority;
  status: RoadmapGoalStatus;
  startDate: string | null;
  dueDate: string | null;
}

export interface MilestoneInput extends GoalInput {
  goalId: string;
}

export interface TaskInput {
  goalId: string | null;
  milestoneId: string | null;
  title: string;
  description: string | null;
  domain: RoadmapDomain;
  priority: RoadmapPriority;
  status: RoadmapTaskStatus;
  startDate: string | null;
  dueDate: string | null;
  estimateMinutes: number | null;
}

function parseTitle(value: unknown): Validation<string> {
  if (typeof value !== 'string') return invalid('title must be text');
  const title = cleanText(value);
  if (!title) return invalid('title is required');
  if (title.length > 200) return invalid('title must be 200 characters or fewer');
  return valid(title);
}

function parseDescription(value: unknown): Validation<string | null> {
  if (value === undefined || value === null) return valid(null);
  if (typeof value !== 'string') return invalid('description must be text or null');
  const description = cleanText(value);
  if (description.length > 4000) {
    return invalid('description must be 4,000 characters or fewer');
  }
  return valid(description || null);
}

function parseDomain(value: unknown, fallback: RoadmapDomain = 'other'): Validation<RoadmapDomain> {
  if (value === undefined) return valid(fallback);
  return isRoadmapDomain(value)
    ? valid(value)
    : invalid('domain must be a supported Roadmap domain');
}

function parsePriority(value: unknown): Validation<RoadmapPriority> {
  if (value === undefined) return valid('medium');
  return isRoadmapPriority(value)
    ? valid(value)
    : invalid('priority must be low, medium, or high');
}

function parseGoalStatus(value: unknown): Validation<RoadmapGoalStatus> {
  if (value === undefined) return valid('active');
  return isGoalStatus(value)
    ? valid(value)
    : invalid('status must be active, done, or paused');
}

function parseTaskStatus(value: unknown): Validation<RoadmapTaskStatus> {
  if (value === undefined) return valid('todo');
  if (value === 'suggested') {
    return invalid('suggested status is reserved for AI-generated tasks');
  }
  return isTaskStatus(value)
    ? valid(value)
    : invalid('status must be todo, done, skipped, or suggested');
}

function parseDate(value: unknown, field: string): Validation<string | null> {
  if (value === undefined || value === null || value === '') return valid(null);
  return isDateString(value)
    ? valid(value)
    : invalid(`${field} must be a valid YYYY-MM-DD date or null`);
}

function parseOptionalUuid(value: unknown, field: string): Validation<string | null> {
  if (value === undefined || value === null || value === '') return valid(null);
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? valid(value)
    : invalid(`${field} must be a UUID or null`);
}

function parseEstimate(value: unknown): Validation<number | null> {
  if (value === undefined || value === null || value === '') return valid(null);
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= 2_147_483_647
    ? valid(value)
    : invalid('estimateMinutes must be a positive 32-bit whole number or null');
}

function firstError(values: Array<Validation<unknown> | undefined>): string | null {
  const failed = values.find((value) => value !== undefined && !value.ok);
  return failed && !failed.ok ? failed.error : null;
}

export function parseGoalInput(
  body: Record<string, unknown>,
  partial = false
): Validation<Partial<GoalInput>> {
  const fields: Array<keyof GoalInput> = [
    'title',
    'description',
    'domain',
    'priority',
    'status',
    'startDate',
    'dueDate',
  ];
  if (partial && !fields.some((field) => body[field] !== undefined)) {
    return invalid('At least one goal field is required');
  }

  const title = body.title === undefined && partial ? undefined : parseTitle(body.title);
  const description = body.description === undefined && partial
    ? undefined
    : parseDescription(body.description);
  const domain = body.domain === undefined && partial ? undefined : parseDomain(body.domain);
  const priority = body.priority === undefined && partial ? undefined : parsePriority(body.priority);
  const status = body.status === undefined && partial ? undefined : parseGoalStatus(body.status);
  const startDate = body.startDate === undefined && partial
    ? undefined
    : parseDate(body.startDate, 'startDate');
  const dueDate = body.dueDate === undefined && partial
    ? undefined
    : parseDate(body.dueDate, 'dueDate');
  const error = firstError(Object.values({
    title,
    description,
    domain,
    priority,
    status,
    startDate,
    dueDate,
  }));
  if (error) return invalid(error);

  const value: Partial<GoalInput> = {};
  if (title?.ok) value.title = title.value;
  if (description?.ok) value.description = description.value;
  if (domain?.ok) value.domain = domain.value;
  if (priority?.ok) value.priority = priority.value;
  if (status?.ok) value.status = status.value;
  if (startDate?.ok) value.startDate = startDate.value;
  if (dueDate?.ok) value.dueDate = dueDate.value;
  return valid(value);
}

export function parseMilestoneInput(
  body: Record<string, unknown>,
  partial = false
): Validation<Partial<MilestoneInput>> {
  const parsedGoal = parseGoalInput(body, partial);
  if (!parsedGoal.ok) return invalid(parsedGoal.error);
  const goalId = body.goalId === undefined && partial
    ? undefined
    : parseOptionalUuid(body.goalId, 'goalId');
  if (goalId && !goalId.ok) return invalid(goalId.error);
  if (goalId?.ok && !goalId.value) return invalid('goalId must be a UUID');
  if (!partial && (!goalId || !goalId.ok)) {
    return invalid('goalId must be a UUID');
  }
  return valid({
    ...parsedGoal.value,
    ...(goalId?.ok && goalId.value !== null ? { goalId: goalId.value } : {}),
  });
}

export function parseTaskInput(
  body: Record<string, unknown>,
  partial = false
): Validation<Partial<TaskInput>> {
  const fields: Array<keyof TaskInput> = [
    'title',
    'description',
    'domain',
    'priority',
    'status',
    'startDate',
    'dueDate',
    'estimateMinutes',
    'goalId',
    'milestoneId',
  ];
  if (partial && !fields.some((field) => body[field] !== undefined)) {
    return invalid('At least one task field is required');
  }

  const title = body.title === undefined && partial ? undefined : parseTitle(body.title);
  const description = body.description === undefined && partial
    ? undefined
    : parseDescription(body.description);
  const domain = body.domain === undefined && partial ? undefined : parseDomain(body.domain);
  const priority = body.priority === undefined && partial ? undefined : parsePriority(body.priority);
  const status = body.status === undefined && partial ? undefined : parseTaskStatus(body.status);
  const startDate = body.startDate === undefined && partial
    ? undefined
    : parseDate(body.startDate, 'startDate');
  const dueDate = body.dueDate === undefined && partial
    ? undefined
    : parseDate(body.dueDate, 'dueDate');
  const estimateMinutes = body.estimateMinutes === undefined && partial
    ? undefined
    : parseEstimate(body.estimateMinutes);
  const goalId = body.goalId === undefined && partial
    ? undefined
    : parseOptionalUuid(body.goalId, 'goalId');
  const milestoneId = body.milestoneId === undefined && partial
    ? undefined
    : parseOptionalUuid(body.milestoneId, 'milestoneId');
  const error = firstError(Object.values({
    title,
    description,
    domain,
    priority,
    status,
    startDate,
    dueDate,
    estimateMinutes,
    goalId,
    milestoneId,
  }));
  if (error) return invalid(error);

  const value: Partial<TaskInput> = {};
  if (title?.ok) value.title = title.value;
  if (description?.ok) value.description = description.value;
  if (domain?.ok) value.domain = domain.value;
  if (priority?.ok) value.priority = priority.value;
  if (status?.ok) value.status = status.value;
  if (startDate?.ok) value.startDate = startDate.value;
  if (dueDate?.ok) value.dueDate = dueDate.value;
  if (estimateMinutes?.ok) value.estimateMinutes = estimateMinutes.value;
  if (goalId?.ok) value.goalId = goalId.value;
  if (milestoneId?.ok) value.milestoneId = milestoneId.value;
  return valid(value);
}

export function validateDateRange(
  startDate: string | null | undefined,
  dueDate: string | null | undefined
): string | null {
  return startDate && dueDate && startDate > dueDate
    ? 'dueDate must not be earlier than startDate'
    : null;
}

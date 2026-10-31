import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { computeWorkScore } from '@/lib/work/report';
import { refreshWorkProvinceScore } from '@/lib/work/api';
import {
  getLogByDate,
  getRecentLogs,
  isDateString,
  isFiniteNumber,
  isRecord,
  isUuid,
  projectExists,
  upsertLog,
} from '@/lib/work/repo';
import { todayPKT } from '@/lib/work/date';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = req.nextUrl.searchParams.get('date');
  if (date) {
    const log = await getLogByDate(userId, date);
    return NextResponse.json({ log });
  }
  const rawLimit = req.nextUrl.searchParams.get('limit');
  const parsedLimit = rawLimit === null ? 30 : Number(rawLimit);
  const limit = Number.isFinite(parsedLimit) ? Math.min(365, Math.max(1, Math.trunc(parsedLimit))) : 30;
  const logs = await getRecentLogs(userId, limit);
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  }
  const logDate = body.logDate === undefined ? todayPKT() : body.logDate;
  if (!isDateString(logDate)) {
    return NextResponse.json({ error: 'A valid logDate (YYYY-MM-DD) is required' }, { status: 400 });
  }

  const numericFields = ['deepWorkHours', 'tasksCompleted', 'profDevMinutes'] as const;
  for (const field of numericFields) {
    if (body[field] !== undefined && !isFiniteNumber(body[field])) {
      return NextResponse.json({ error: `${field} must be a finite number` }, { status: 400 });
    }
  }
  const booleanFields = ['milestoneDone', 'noProcrastination', 'clientDeliverable'] as const;
  for (const field of booleanFields) {
    if (body[field] !== undefined && typeof body[field] !== 'boolean') {
      return NextResponse.json({ error: `${field} must be a boolean` }, { status: 400 });
    }
  }
  let projectId: string | null = null;
  if (body.projectId !== undefined && body.projectId !== null && body.projectId !== '') {
    if (!isUuid(body.projectId)) {
      return NextResponse.json({ error: 'projectId must be a valid project ID' }, { status: 400 });
    }
    projectId = body.projectId;
  }
  if (projectId && !(await projectExists(userId, projectId))) {
    return NextResponse.json({ error: 'projectId not found' }, { status: 400 });
  }
  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== 'string') {
    return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 });
  }

  const log = await upsertLog(userId, {
    logDate,
    deepWorkHours: isFiniteNumber(body.deepWorkHours) ? body.deepWorkHours : 0,
    tasksCompleted: isFiniteNumber(body.tasksCompleted) ? body.tasksCompleted : 0,
    milestoneDone: body.milestoneDone === true,
    profDevMinutes: isFiniteNumber(body.profDevMinutes) ? body.profDevMinutes : 0,
    noProcrastination: body.noProcrastination === true,
    clientDeliverable: body.clientDeliverable === true,
    projectId,
    notes: typeof body.notes === 'string' ? body.notes : null,
  });
  const report = await computeWorkScore(userId);
  await refreshWorkProvinceScore(userId);
  return NextResponse.json({ log, report });
}

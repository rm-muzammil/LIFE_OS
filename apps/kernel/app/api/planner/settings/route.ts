import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { getPlannerSettings, savePlannerSettings } from '@/lib/planner/repo';
import { mergeAndValidateSettings, parseSettingsInput } from '@/lib/planner/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ settings: await getPlannerSettings(userId) }, {
    headers: { 'Cache-Control': 'no-store, must-revalidate' },
  });
}

export async function PUT(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = parseSettingsInput(await request.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const current = await getPlannerSettings(userId);
  const merged = mergeAndValidateSettings(parsed.value, current);
  if (!merged.ok) return NextResponse.json({ error: merged.error }, { status: 400 });
  const settings = await savePlannerSettings(userId, merged.value);
  return NextResponse.json({ settings });
}

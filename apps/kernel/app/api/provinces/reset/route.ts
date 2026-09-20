import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { resetToDefaultProvinces } from '@/lib/default-provinces';

export const dynamic = 'force-dynamic';

// Not in the original spec's file list, but the provinces page's
// "Reset to defaults" button needs something to call — see
// lib/default-provinces.ts:resetToDefaultProvinces for what this deletes
// and recreates, and what history survives it.
export async function POST() {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await resetToDefaultProvinces(userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('provinces/reset error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

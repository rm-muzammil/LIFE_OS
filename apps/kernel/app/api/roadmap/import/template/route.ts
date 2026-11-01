import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { ROADMAP_CSV_TEMPLATE } from '@/lib/roadmap/template';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getApiUserId())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return new NextResponse(ROADMAP_CSV_TEMPLATE, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="roadmap-template.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

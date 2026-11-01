import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { parseUpload, confirmImport } from '@/lib/roadmap/import';
import { MAX_CSV_BYTES } from '@/lib/roadmap/csv';
import { isUuid, purgeExpiredPendingImportBatches } from '@/lib/roadmap/repo';
import { refreshRoadmapProvinceScore } from '@/lib/roadmap/api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await purgeExpiredPendingImportBatches(userId);
  } catch {
    console.error('Roadmap expired preview cleanup failed.');
    return NextResponse.json({ error: 'Expired previews could not be cleaned up' }, { status: 500 });
  }
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_CSV_BYTES + 16_384) {
    return NextResponse.json({ error: 'CSV upload exceeds the 1 MB limit' }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'A multipart CSV upload is required' }, { status: 400 });
  }
  const file = form.get('file');
  const batchId = form.get('batchId');
  if (!(file instanceof File)) return NextResponse.json({ error: 'A CSV file is required' }, { status: 400 });
  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json({ error: 'CSV file exceeds the 1 MB limit' }, { status: 413 });
  }
  if (!isUuid(batchId)) {
    return NextResponse.json({ error: 'A valid preview batchId is required' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let parsed: ReturnType<typeof parseUpload>;
  try {
    parsed = parseUpload(bytes, file.name);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'CSV could not be confirmed',
    }, { status: 400 });
  }
  try {
    const result = await confirmImport(
      userId,
      batchId,
      bytes,
      file.name
    );
    if (result.kind === 'conflict') {
      return NextResponse.json({
        error: 'This import batch has already been confirmed or is being processed',
        status: result.status,
      }, { status: 409 });
    }
    await refreshRoadmapProvinceScore(userId);
    return NextResponse.json({ batchId, ...result.counts });
  } catch {
    return NextResponse.json({
      error: 'Import failed after starting. Delete the failed batch before retrying.',
    }, { status: 500 });
  }
}

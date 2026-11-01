import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth';
import { parseUpload, prepareImportPreview } from '@/lib/roadmap/import';
import { MAX_CSV_BYTES } from '@/lib/roadmap/csv';
import { purgeExpiredPendingImportBatches } from '@/lib/roadmap/repo';

export const dynamic = 'force-dynamic';

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
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A CSV file is required' }, { status: 400 });
  }
  if (file.size > MAX_CSV_BYTES) {
    return NextResponse.json({ error: 'CSV file exceeds the 1 MB limit' }, { status: 413 });
  }

  let parsed: ReturnType<typeof parseUpload>;
  try {
    parsed = parseUpload(new Uint8Array(await file.arrayBuffer()), file.name);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'CSV could not be previewed',
    }, { status: 400 });
  }
  try {
    const preview = await prepareImportPreview(userId, parsed);
    return NextResponse.json(preview);
  } catch {
    console.error('Roadmap CSV preview preparation failed.');
    return NextResponse.json({ error: 'CSV preview could not be completed' }, { status: 500 });
  }
}

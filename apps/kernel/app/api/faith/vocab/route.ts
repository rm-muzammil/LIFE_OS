import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { faithVocabBank } from '@/db/schema';
import { getApiUserId } from '@/lib/auth';
import { isFiniteInteger, isRecord, isUuid } from '@/lib/faith/validation';
import { refreshFaithProvinceScore } from '@/lib/faith/refresh';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raku = req.nextUrl.searchParams.get('raku');
  if (raku !== null && (!/^\d+$/.test(raku) || !Number.isSafeInteger(Number(raku)))) {
    return NextResponse.json({ error: 'raku must be a positive integer' }, { status: 400 });
  }
  const rows = await db
    .select()
    .from(faithVocabBank)
    .where(
      raku === null
        ? eq(faithVocabBank.userId, userId)
        : and(
            eq(faithVocabBank.userId, userId),
            eq(faithVocabBank.rakuNumber, Number(raku))
          )
    )
    .orderBy(desc(faithVocabBank.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: unknown = await req.json();
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'A valid request body is required' }, { status: 400 });
  }
  if (
    !isFiniteInteger(body.rakuNumber) ||
    body.rakuNumber < 1 ||
    typeof body.word !== 'string' ||
    !body.word.trim() ||
    typeof body.meaning !== 'string' ||
    !body.meaning.trim()
  ) {
    return NextResponse.json(
      { error: 'word, meaning, and a positive rakuNumber are required' },
      { status: 400 }
    );
  }
  if (body.root !== undefined && body.root !== null && typeof body.root !== 'string') {
    return NextResponse.json({ error: 'root must be a string or null' }, { status: 400 });
  }
  if (body.status !== undefined && (typeof body.status !== 'string' || !body.status.trim())) {
    return NextResponse.json({ error: 'status must be a non-empty string' }, { status: 400 });
  }

  const [row] = await db
    .insert(faithVocabBank)
    .values({
      userId,
      rakuNumber: body.rakuNumber,
      word: body.word.trim(),
      root: typeof body.root === 'string' ? body.root : null,
      meaning: body.meaning.trim(),
      status: typeof body.status === 'string' ? body.status : 'new',
    })
    .returning();
  await refreshFaithProvinceScore(userId);
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getApiUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!isUuid(id)) return NextResponse.json({ error: 'A valid id is required' }, { status: 400 });
  await db
    .delete(faithVocabBank)
    .where(and(eq(faithVocabBank.userId, userId), eq(faithVocabBank.id, id)));
  await refreshFaithProvinceScore(userId);
  return NextResponse.json({ ok: true });
}

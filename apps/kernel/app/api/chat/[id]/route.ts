import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getApiUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deleted = await db
      .delete(chatMessages)
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.id, params.id)))
      .returning({ id: chatMessages.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: deleted[0].id });
  } catch (err) {
    console.error('chat DELETE error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

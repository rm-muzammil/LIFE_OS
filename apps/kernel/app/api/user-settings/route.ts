import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getApiUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Masks a key for display: keeps the last 4 chars, blanks the rest.
// Never send full stored keys back to the client after they're saved once.
function mask(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 4) return '••••';
  return `••••${key.slice(-4)}`;
}

export async function GET() {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

    return NextResponse.json({
      geminiKey1: mask(row?.geminiKey1 ?? null),
      geminiKey2: mask(row?.geminiKey2 ?? null),
      geminiKey3: mask(row?.geminiKey3 ?? null),
      hasAnyKey: Boolean(row?.geminiKey1 || row?.geminiKey2 || row?.geminiKey3),
    });
  } catch (err) {
    console.error('user-settings GET error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

interface PostBody {
  geminiKey1?: string | null;
  geminiKey2?: string | null;
  geminiKey3?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getApiUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as PostBody;
    // Only overwrite keys that were actually sent — omitting a field keeps
    // whatever is already stored, so the masked GET response never needs to
    // round-trip back into a PATCH-like partial update by accident.
    const updates: Record<string, string | null> = {};
    if ('geminiKey1' in body) updates.geminiKey1 = body.geminiKey1?.trim() || null;
    if ('geminiKey2' in body) updates.geminiKey2 = body.geminiKey2?.trim() || null;
    if ('geminiKey3' in body) updates.geminiKey3 = body.geminiKey3?.trim() || null;

    const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));

    if (existing) {
      await db
        .update(userSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values({ userId, ...updates });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('user-settings POST error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

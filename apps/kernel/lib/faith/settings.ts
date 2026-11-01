import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { faithSettings } from '@/db/schema';

export async function getFaithSetting(userId: string, key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: faithSettings.value })
    .from(faithSettings)
    .where(and(eq(faithSettings.userId, userId), eq(faithSettings.key, key)))
    .limit(1);
  return row?.value ?? null;
}

export async function setFaithSetting(userId: string, key: string, value: string): Promise<void> {
  await db
    .insert(faithSettings)
    .values({ userId, key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [faithSettings.userId, faithSettings.key],
      set: { value, updatedAt: new Date() },
    });
}

export async function advanceFaithVerseIndexOnce(
  userId: string,
  date: string,
  verseCount: number
): Promise<number> {
  const lastAdvanced = await getFaithSetting(userId, 'verse_last_advanced');
  const currentValue = await getFaithSetting(userId, 'current_verse_index');
  const parsedIndex = currentValue === null ? 0 : Number(currentValue);
  const currentIndex =
    Number.isSafeInteger(parsedIndex) && parsedIndex >= 0
      ? Math.min(parsedIndex, verseCount - 1)
      : 0;
  if (lastAdvanced === date) return currentIndex;

  const nextIndex = (currentIndex + 1) % verseCount;
  await setFaithSetting(userId, 'current_verse_index', String(nextIndex));
  await setFaithSetting(userId, 'verse_last_advanced', date);
  return nextIndex;
}

export async function getFaithVerseIndex(userId: string, verseCount: number): Promise<number> {
  const value = await getFaithSetting(userId, 'current_verse_index');
  const parsedIndex = value === null ? 0 : Number(value);
  if (!Number.isSafeInteger(parsedIndex) || parsedIndex < 0) return 0;
  return Math.min(parsedIndex, verseCount - 1);
}

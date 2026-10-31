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
): Promise<void> {
  const lastAdvanced = await getFaithSetting(userId, 'verse_last_advanced');
  if (lastAdvanced === date) return;

  const currentValue = await getFaithSetting(userId, 'current_verse_index');
  const parsedIndex = currentValue === null ? 0 : Number(currentValue);
  const currentIndex = Number.isSafeInteger(parsedIndex) ? parsedIndex : 0;
  await setFaithSetting(userId, 'current_verse_index', String((currentIndex + 1) % verseCount));
  await setFaithSetting(userId, 'verse_last_advanced', date);
}

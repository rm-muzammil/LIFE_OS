import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { refreshInternalProvince } from '@/lib/internal-provinces';

export async function getPersonalGeminiKeys(userId: string): Promise<string[]> {
  const [settings] = await db
    .select({
      geminiKey1: userSettings.geminiKey1,
      geminiKey2: userSettings.geminiKey2,
      geminiKey3: userSettings.geminiKey3,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return [settings?.geminiKey1, settings?.geminiKey2, settings?.geminiKey3].filter(
    (key): key is string => Boolean(key)
  );
}

export async function refreshPersonalProvinceScore(userId: string): Promise<void> {
  try {
    await refreshInternalProvince(userId, 'personal');
  } catch (error) {
    console.error('Personal province score refresh failed:', error);
  }
}

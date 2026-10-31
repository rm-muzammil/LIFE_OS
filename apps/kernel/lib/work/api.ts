import { refreshInternalProvince } from '@/lib/internal-provinces';

export async function refreshWorkProvinceScore(userId: string): Promise<void> {
  try {
    await refreshInternalProvince(userId, 'work');
  } catch (error) {
    console.error('Work province score refresh failed:', error);
  }
}

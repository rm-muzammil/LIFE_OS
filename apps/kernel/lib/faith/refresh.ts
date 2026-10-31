import { refreshInternalProvince } from '@/lib/internal-provinces';

export async function refreshFaithProvinceScore(userId: string): Promise<void> {
  try {
    await refreshInternalProvince(userId, 'faith');
  } catch {
    console.error('Failed to refresh Faith province score.');
  }
}

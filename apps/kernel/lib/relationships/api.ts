import { refreshInternalProvince } from '@/lib/internal-provinces';

export async function refreshRelationshipsProvinceScore(userId: string): Promise<void> {
  try {
    await refreshInternalProvince(userId, 'relationships');
  } catch (error) {
    console.error('Relationships province score refresh failed:', error);
  }
}

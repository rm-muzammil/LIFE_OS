import { refreshInternalProvince } from '@/lib/internal-provinces';

export async function refreshRoadmapProvinceScore(userId: string): Promise<void> {
  try {
    await refreshInternalProvince(userId, 'roadmap');
  } catch (error) {
    console.error('Roadmap province score refresh failed:', error);
  }
}

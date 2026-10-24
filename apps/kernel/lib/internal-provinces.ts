import { computeWealthScore } from '@/lib/wealth/score';
import type { ProvincePayload } from '@/lib/wealth/types';

export const INTERNAL_PROVINCES: Record<
  string,
  (userId: string) => Promise<ProvincePayload>
> = {
  wealth: computeWealthScore,
};

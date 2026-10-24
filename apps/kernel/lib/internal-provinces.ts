import { computeWealthScore } from '@/lib/wealth/score';
import type { ProvincePayload } from '@/lib/wealth/types';

type InternalProvinceScorer = (userId: string) => Promise<ProvincePayload>;

export const INTERNAL_PROVINCES: Partial<Record<string, InternalProvinceScorer>> = {
  wealth: computeWealthScore,
};

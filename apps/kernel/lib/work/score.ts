import type { ScoreBreakdown } from '@/lib/work/types';

export const SCORE_CAP = 100;

export interface ScoreInput {
  deepWorkHours: number;
  tasksCompleted: number;
  milestoneDone: boolean;
  profDevMinutes: number;
  noProcrastination: boolean;
  clientDeliverable: boolean;
}

export function computeScore(input: ScoreInput): ScoreBreakdown {
  const deepWork = (Math.min(Math.max(input.deepWorkHours, 0), 4) / 4) * 25;
  const tasks = (Math.min(Math.max(input.tasksCompleted, 0), 5) / 5) * 20;
  const milestone = input.milestoneDone ? 20 : 0;
  const profDev = input.profDevMinutes >= 30 ? 15 : 0;
  const noProcrastin = input.noProcrastination ? 10 : 0;
  const clientBonus = input.clientDeliverable ? 10 : 0;
  const total = Math.min(SCORE_CAP, Math.round(deepWork + tasks + milestone + profDev + noProcrastin + clientBonus));

  return {
    deepWork: Math.round(deepWork * 10) / 10,
    tasks: Math.round(tasks * 10) / 10,
    milestone,
    profDev,
    noProcrastin,
    clientBonus,
    total,
  };
}

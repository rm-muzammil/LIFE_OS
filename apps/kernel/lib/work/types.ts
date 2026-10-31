import type { WorkDailyLog, WorkProject } from '@/db/schema';

export type DailyLog = WorkDailyLog;
export type Project = WorkProject;
export type ProjectStatus = 'active' | 'paused' | 'completed';

export interface ScoreBreakdown {
  deepWork: number;
  tasks: number;
  milestone: number;
  profDev: number;
  noProcrastin: number;
  clientBonus: number;
  total: number;
}

export interface WorkReport {
  score: number;
  label: 'Work';
  streak: number;
  todayDone: boolean;
  updatedAt: string;
  details: {
    deepWorkHours: number;
    tasksCompleted: number;
    milestoneDone: boolean;
    profDevMinutes: number;
    noProcrastination: boolean;
    clientDeliverable: boolean;
  };
}

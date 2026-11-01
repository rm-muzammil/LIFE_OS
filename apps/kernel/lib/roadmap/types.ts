export const ROADMAP_DOMAINS = [
  'faith',
  'personal',
  'wealth',
  'relationships',
  'work',
  'learning',
  'other',
] as const;

export type RoadmapDomain = (typeof ROADMAP_DOMAINS)[number];
export type RoadmapPriority = 'low' | 'medium' | 'high';
export type RoadmapSource = 'csv' | 'ai' | 'manual';
export type RoadmapGoalStatus = 'active' | 'done' | 'paused';
export type RoadmapTaskStatus = 'todo' | 'done' | 'skipped' | 'suggested';
export type RoadmapRowType = 'goal' | 'milestone' | 'task';

export interface RoadmapRowIssue {
  row: number;
  column: string;
  reason: string;
}

export interface RoadmapCsvRow {
  rowNumber: number;
  type: RoadmapRowType | null;
  title: string;
  parent: string | null;
  domain: RoadmapDomain;
  startDate: string | null;
  dueDate: string | null;
  priority: RoadmapPriority;
  estimateMinutes: number | null;
  description: string | null;
  goalParentRow: number | null;
  milestoneParentRow: number | null;
  issues: RoadmapRowIssue[];
}

export interface RoadmapCsvPreview {
  rows: RoadmapCsvRow[];
  errors: RoadmapRowIssue[];
  counts: Record<RoadmapRowType, number>;
  importableCounts: Record<RoadmapRowType, number>;
  skippedCount: number;
}

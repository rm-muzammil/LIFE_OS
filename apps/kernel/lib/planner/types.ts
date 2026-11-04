import type {
  PlannerCommitment,
  PlannerSettingsRow,
  PlannerTrack,
} from '@life-os/db';

export type PlannerKind = 'lecture' | 'work' | 'other';
export type PlannerDomain =
  | 'faith'
  | 'personal'
  | 'wealth'
  | 'relationships'
  | 'work'
  | 'learning'
  | 'other';
export type PlannerPriority = 'low' | 'medium' | 'high';
export type PreferredWindow = 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
export type PrayerSource = 'auto' | 'manual' | 'default';

export type PlannerSettings = Omit<PlannerSettingsRow, 'updatedAt'>;
export type PlannerCommitmentRow = PlannerCommitment;
export type PlannerTrackRow = PlannerTrack;

export const DEFAULT_PLANNER_SETTINGS: PlannerSettings = {
  userId: '',
  wakeTime: '05:00',
  sleepTime: '23:00',
  prayerBlockMinutes: 20,
  prayerBufferBeforeMinutes: 10,
  jumuahBlockMinutes: 90,
  breakMinutes: 5,
  minSessionMinutes: 25,
  prayerAuto: false,
  prayerCity: null,
  prayerCountry: null,
  prayerMethod: 1,
  prayerAsrSchool: 1,
  engineEnabled: false,
  weekStart: 1,
  slackPercent: 15,
  defaultTaskMinutes: 30,
  preferredSessionMinutes: 45,
  stretchEnabled: false,
};

export interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface PrayerTimesResult extends PrayerTimes {
  source: PrayerSource;
  isFriday: boolean;
}

export type PlannerBlockKind = 'prayer' | 'commitment' | 'sleep';

export interface PlannerBlock {
  id: string;
  title: string;
  kind: PlannerBlockKind;
  startMinute: number;
  endMinute: number;
  commitmentId?: string;
  prayer?: keyof PrayerTimes;
}

export interface PlannerOverlapWarning {
  firstBlockId: string;
  secondBlockId: string;
  message: string;
}

export interface FreeGap {
  startMinute: number;
  endMinute: number;
  minutes: number;
}

export interface PlannerTodayView {
  date: string;
  prayers: PrayerTimesResult;
  blocks: PlannerBlock[];
  gaps: FreeGap[];
  warnings: PlannerOverlapWarning[];
}

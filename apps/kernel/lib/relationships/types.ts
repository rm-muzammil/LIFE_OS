import type { RelationshipsDailyLog, RelationshipsSetting } from '@/db/schema';

export type DailyLog = RelationshipsDailyLog;
export type Setting = RelationshipsSetting;

export interface RelationshipsReport {
  score: number;
  label: 'Relationships';
  streak: number;
  todayDone: boolean;
  updatedAt: string;
  details: {
    contactedParents: boolean;
    familyTies: boolean;
    helpedSomeone: boolean;
    goodDeed: boolean;
    communityObligation: boolean;
    charityAmount: number;
    goodDeedsCount: number;
  };
}

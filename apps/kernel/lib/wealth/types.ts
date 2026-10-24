import type {
  WealthDebt,
  WealthGoal,
  WealthTransaction,
  WealthZakatAsset,
} from '@/db/schema';

export type Transaction = WealthTransaction;
export type ZakatAsset = WealthZakatAsset;
export type Goal = WealthGoal;
export type Debt = WealthDebt;

export interface WealthReport {
  score: number;
  label: 'Wealth';
  streak: number;
  todayDone: boolean;
  updatedAt: string;
  details: {
    monthlyNet: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    zakatDue: number;
    activeGoals: number;
    totalDebt: number;
    sadaqahMonth: number;
    halalCompliant: boolean;
  };
}

export type ProvincePayload = WealthReport;

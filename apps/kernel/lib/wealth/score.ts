import { db } from '@/db';
import {
  wealthDebts,
  wealthGoals,
  wealthTransactions,
  wealthZakatAssets,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { computeReport } from '@/lib/wealth/scoring';
import type { ProvincePayload } from '@/lib/wealth/types';

export async function computeWealthScore(userId: string): Promise<ProvincePayload> {
  const [transactions, assets, goals, debts] = await Promise.all([
    db.select().from(wealthTransactions).where(eq(wealthTransactions.userId, userId)),
    db.select().from(wealthZakatAssets).where(eq(wealthZakatAssets.userId, userId)),
    db.select().from(wealthGoals).where(eq(wealthGoals.userId, userId)),
    db.select().from(wealthDebts).where(eq(wealthDebts.userId, userId)),
  ]);

  return computeReport(transactions, assets, goals, debts);
}

import type { Split } from './types.js';
import { getReceiptTotal } from './receiptTotal.js';

export type CategoryKey = string;

export interface CategoryTotal {
  category: CategoryKey;
  cents: number;
  percent: number;
}

export type SpendingPeriod = 'daily' | 'weekly' | 'monthly';

export function getThisMonthStart(): number {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function getTodayStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getWeekStart(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // Monday-based
  d.setDate(d.getDate() - diff);
  return d.getTime();
}

export function getMonthStartLocal(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getPeriodStart(period: SpendingPeriod): number {
  switch (period) {
    case 'daily': return getTodayStart();
    case 'weekly': return getWeekStart();
    case 'monthly': return getMonthStartLocal();
  }
}

export function getPeriodEnd(period: SpendingPeriod): number {
  const start = getPeriodStart(period);
  const d = new Date(start);
  switch (period) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d.getTime();
}

export function getPeriodLabel(period: SpendingPeriod): string {
  switch (period) {
    case 'daily': return 'Today';
    case 'weekly': return 'This week';
    case 'monthly': return 'This month';
  }
}

export function getSplitsInRange(splits: Split[], startMs: number, endMs: number): Split[] {
  return splits.filter((s) => {
    const ts = s.updatedAt ?? s.createdAt;
    return ts >= startMs && ts < endMs;
  });
}

export function getSplitsThisMonth(splits: Split[]): Split[] {
  const start = getThisMonthStart();
  return splits.filter((s) => {
    const ts = s.updatedAt ?? s.createdAt;
    return ts >= start;
  });
}

export function getUserShareCents(split: Split): number {
  if (split.excludeMe) return 0;
  const total = getReceiptTotal(split);
  const n = split.participants.length;
  if (n === 0) return 0;
  return Math.floor(total / n);
}

export function getTotalSpendingCents(splits: Split[]): number {
  return splits.reduce((sum, split) => sum + getReceiptTotal(split), 0);
}

export function getUserSpendingCents(splits: Split[]): number {
  return splits.reduce((sum, split) => sum + getUserShareCents(split), 0);
}

export function getCategoryTotals(splits: Split[]): CategoryTotal[] {
  const totalUserCents = getUserSpendingCents(splits);
  const byCategory = new Map<CategoryKey, number>();

  splits.forEach((split) => {
    const category: CategoryKey = split.category ?? 'Uncategorized';
    const userShare = getUserShareCents(split);
    byCategory.set(category, (byCategory.get(category) ?? 0) + userShare);
  });

  return Array.from(byCategory.entries())
    .map(([category, cents]) => ({
      category,
      cents,
      percent: totalUserCents > 0 ? (cents / totalUserCents) * 100 : 0,
    }))
    .sort((a, b) => b.cents - a.cents);
}

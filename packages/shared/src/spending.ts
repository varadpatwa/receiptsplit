import type { Split } from './types';
import { getReceiptTotal } from './receiptTotal';

export type CategoryKey = string;

export interface CategoryTotal {
  category: CategoryKey;
  cents: number;
  percent: number;
}

export function getThisMonthStart(): number {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
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

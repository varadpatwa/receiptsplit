import { Split } from '@/types/split';
import { getReceiptTotal } from '@/utils/calculations';

export type CategoryKey = string; // SplitCategory | 'Uncategorized'

export interface CategoryTotal {
  category: CategoryKey;
  cents: number;
  percent: number;
}

/**
 * Start of current month (UTC) in ms
 */
export function getThisMonthStart(): number {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Splits whose updatedAt (or createdAt) falls within this calendar month
 */
export function getSplitsThisMonth(splits: Split[]): Split[] {
  const start = getThisMonthStart();
  return splits.filter(s => {
    const ts = s.updatedAt ?? s.createdAt;
    return ts >= start;
  });
}

/**
 * Total spending in cents for given splits
 */
export function getTotalSpendingCents(splits: Split[]): number {
  return splits.reduce((sum, split) => sum + getReceiptTotal(split), 0);
}

/**
 * Per-category totals (cents and %) for given splits.
 * Category is split.category or 'Uncategorized'.
 */
export function getCategoryTotals(splits: Split[]): CategoryTotal[] {
  const totalCents = getTotalSpendingCents(splits);
  const byCategory = new Map<CategoryKey, number>();

  splits.forEach(split => {
    const category: CategoryKey = split.category ?? 'Uncategorized';
    const cents = getReceiptTotal(split);
    byCategory.set(category, (byCategory.get(category) ?? 0) + cents);
  });

  return Array.from(byCategory.entries())
    .map(([category, cents]) => ({
      category,
      cents,
      percent: totalCents > 0 ? (cents / totalCents) * 100 : 0,
    }))
    .sort((a, b) => b.cents - a.cents);
}

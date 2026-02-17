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
 * Calculate user's share for a split (equal split: total / participantsCount).
 * Returns 0 if excludeMe=true.
 */
export function getUserShareCents(split: Split): number {
  if (split.excludeMe) {
    return 0;
  }
  const total = getReceiptTotal(split);
  const participantCount = split.participants.length;
  if (participantCount === 0) return 0;
  return Math.floor(total / participantCount);
}

/**
 * Total spending in cents for given splits (sum of receipt totals)
 */
export function getTotalSpendingCents(splits: Split[]): number {
  return splits.reduce((sum, split) => sum + getReceiptTotal(split), 0);
}

/**
 * User's total spending share in cents for given splits.
 * For each split: if excludeMe=false, counts userShare = total / participantsCount; else 0.
 */
export function getUserSpendingCents(splits: Split[]): number {
  return splits.reduce((sum, split) => sum + getUserShareCents(split), 0);
}

/**
 * Per-category totals (cents and %) for given splits.
 * Category is split.category or 'Uncategorized'.
 * Uses user's share (getUserShareCents) instead of total receipt amount.
 */
export function getCategoryTotals(splits: Split[]): CategoryTotal[] {
  const totalUserCents = getUserSpendingCents(splits);
  const byCategory = new Map<CategoryKey, number>();

  splits.forEach(split => {
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

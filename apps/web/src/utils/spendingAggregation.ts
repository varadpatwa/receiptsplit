import {
  getSplitsThisMonth,
  getUserShareCents,
  getUserSpendingCents,
  getTotalSpendingCents,
  getCategoryTotals,
  type CategoryTotal,
  type CategoryKey,
} from '@receiptsplit/shared';

export type { CategoryKey, CategoryTotal } from '@receiptsplit/shared';
export { getSplitsThisMonth, getUserShareCents, getUserSpendingCents, getTotalSpendingCents, getCategoryTotals };

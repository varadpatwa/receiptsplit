import { describe, it, expect } from 'vitest';
import {
  getUserShareCents,
  getUserSpendingCents,
  getCategoryTotals,
} from './spendingAggregation';
import { Split } from '@/types/split';

describe('spendingAggregation - excludeMe', () => {
  const createSplit = (excludeMe: boolean, totalCents: number, participantCount: number): Split => {
    const participants = excludeMe
      ? Array.from({ length: participantCount }, (_, i) => ({ id: `p${i}`, name: `Person ${i}` }))
      : [{ id: 'me', name: 'Me' }, ...Array.from({ length: participantCount - 1 }, (_, i) => ({ id: `p${i}`, name: `Person ${i}` }))];
    
    return {
      id: 'test-split',
      name: 'Test Split',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [{ id: 'item1', name: 'Item', priceInCents: totalCents, quantity: 1, assignments: [] }],
      participants,
      taxInCents: 0,
      tipInCents: 0,
      currentStep: 'receipt',
      excludeMe,
    };
  };

  describe('getUserShareCents', () => {
    it('should return 0 when excludeMe=true', () => {
      const split = createSplit(true, 10000, 3); // $100.00, 3 people (no "me")
      const share = getUserShareCents(split);
      expect(share).toBe(0);
    });

    it('should return equal share when excludeMe=false', () => {
      const split = createSplit(false, 10000, 3); // $100.00, 3 people (including "me")
      const share = getUserShareCents(split);
      expect(share).toBe(3333); // 10000 / 3 = 3333.33... -> floor = 3333
    });

    it('should handle remainder distribution', () => {
      const split = createSplit(false, 10001, 3); // $100.01, 3 people
      const share = getUserShareCents(split);
      // 10001 / 3 = 3333.66... -> floor = 3333 (remainder 2 cents distributed elsewhere)
      expect(share).toBe(3333);
    });
  });

  describe('getUserSpendingCents', () => {
    it('should sum user shares, excluding splits where excludeMe=true', () => {
      const splits: Split[] = [
        createSplit(false, 10000, 2), // $100 / 2 = $50
        createSplit(true, 20000, 3),  // excluded: $0
        createSplit(false, 30000, 3), // $300 / 3 = $100
      ];
      const total = getUserSpendingCents(splits);
      expect(total).toBe(5000 + 0 + 10000); // 15000 cents = $150.00
    });

    it('should return 0 when all splits excludeMe=true', () => {
      const splits: Split[] = [
        createSplit(true, 10000, 2),
        createSplit(true, 20000, 3),
      ];
      const total = getUserSpendingCents(splits);
      expect(total).toBe(0);
    });
  });

  describe('getCategoryTotals', () => {
    it('should use user shares, not total receipt amounts', () => {
      const splits: Split[] = [
        { ...createSplit(false, 10000, 2), category: 'Restaurant' }, // $50 user share
        { ...createSplit(true, 20000, 3), category: 'Restaurant' },   // $0 user share (excluded)
        { ...createSplit(false, 30000, 3), category: 'Grocery' },    // $100 user share
      ];
      const totals = getCategoryTotals(splits);
      
      const restaurant = totals.find(t => t.category === 'Restaurant');
      const grocery = totals.find(t => t.category === 'Grocery');
      
      expect(restaurant?.cents).toBe(5000); // Only the included split counts
      expect(grocery?.cents).toBe(10000);
      expect(restaurant?.percent).toBeCloseTo(33.33, 1);
      expect(grocery?.percent).toBeCloseTo(66.67, 1);
    });
  });
});

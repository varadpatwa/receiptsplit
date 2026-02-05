import { describe, it, expect } from 'vitest';
import { getReceiptTotal } from './calculations';
import { Split } from '@/types/split';
import { formatCurrency } from './formatting';

describe('getReceiptTotal', () => {
  it('should return 0 for split with missing priceInCents', () => {
    const split: Split = {
      id: 'test-1',
      name: 'Test Split',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [
        {
          id: 'item-1',
          name: 'Item 1',
          priceInCents: undefined as any,
          quantity: 2,
          assignments: [],
        },
      ],
      participants: [],
      taxInCents: 0,
      tipInCents: 0,
      currentStep: 'receipt',
    };

    const total = getReceiptTotal(split);
    expect(total).toBe(0);
    expect(Number.isFinite(total)).toBe(true);
    expect(formatCurrency(total)).toBe('$0.00');
  });

  it('should return 0 for split with missing quantity', () => {
    const split: Split = {
      id: 'test-2',
      name: 'Test Split',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [
        {
          id: 'item-1',
          name: 'Item 1',
          priceInCents: 1000,
          quantity: undefined as any,
          assignments: [],
        },
      ],
      participants: [],
      taxInCents: 0,
      tipInCents: 0,
      currentStep: 'receipt',
    };

    const total = getReceiptTotal(split);
    expect(total).toBe(0);
    expect(Number.isFinite(total)).toBe(true);
    expect(formatCurrency(total)).toBe('$0.00');
  });

  it('should return 0 for split with NaN priceInCents', () => {
    const split: Split = {
      id: 'test-3',
      name: 'Test Split',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [
        {
          id: 'item-1',
          name: 'Item 1',
          priceInCents: NaN,
          quantity: 2,
          assignments: [],
        },
      ],
      participants: [],
      taxInCents: 0,
      tipInCents: 0,
      currentStep: 'receipt',
    };

    const total = getReceiptTotal(split);
    expect(total).toBe(0);
    expect(Number.isFinite(total)).toBe(true);
    expect(formatCurrency(total)).toBe('$0.00');
  });

  it('should return 0 for split with NaN taxInCents', () => {
    const split: Split = {
      id: 'test-4',
      name: 'Test Split',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [
        {
          id: 'item-1',
          name: 'Item 1',
          priceInCents: 1000,
          quantity: 1,
          assignments: [],
        },
      ],
      participants: [],
      taxInCents: NaN,
      tipInCents: 0,
      currentStep: 'receipt',
    };

    const total = getReceiptTotal(split);
    expect(total).toBe(1000);
    expect(Number.isFinite(total)).toBe(true);
    expect(formatCurrency(total)).toBe('$10.00');
  });

  it('should return 0 for split with NaN tipInCents', () => {
    const split: Split = {
      id: 'test-5',
      name: 'Test Split',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [
        {
          id: 'item-1',
          name: 'Item 1',
          priceInCents: 1000,
          quantity: 1,
          assignments: [],
        },
      ],
      participants: [],
      taxInCents: 0,
      tipInCents: NaN,
      currentStep: 'receipt',
    };

    const total = getReceiptTotal(split);
    expect(total).toBe(1000);
    expect(Number.isFinite(total)).toBe(true);
    expect(formatCurrency(total)).toBe('$10.00');
  });

  it('should return 0 for split with null taxInCents and tipInCents', () => {
    const split: Split = {
      id: 'test-6',
      name: 'Test Split',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [
        {
          id: 'item-1',
          name: 'Item 1',
          priceInCents: 1000,
          quantity: 1,
          assignments: [],
        },
      ],
      participants: [],
      taxInCents: null as any,
      tipInCents: null as any,
      currentStep: 'receipt',
    };

    const total = getReceiptTotal(split);
    expect(total).toBe(1000);
    expect(Number.isFinite(total)).toBe(true);
    expect(formatCurrency(total)).toBe('$10.00');
  });

  it('should handle multiple items with missing values', () => {
    const split: Split = {
      id: 'test-7',
      name: 'Test Split',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [
        {
          id: 'item-1',
          name: 'Item 1',
          priceInCents: undefined as any,
          quantity: 2,
          assignments: [],
        },
        {
          id: 'item-2',
          name: 'Item 2',
          priceInCents: 500,
          quantity: undefined as any,
          assignments: [],
        },
        {
          id: 'item-3',
          name: 'Item 3',
          priceInCents: 1000,
          quantity: 1,
          assignments: [],
        },
      ],
      participants: [],
      taxInCents: NaN,
      tipInCents: null as any,
      currentStep: 'receipt',
    };

    const total = getReceiptTotal(split);
    expect(total).toBe(1000);
    expect(Number.isFinite(total)).toBe(true);
    expect(formatCurrency(total)).toBe('$10.00');
  });

  it('should calculate correctly with valid values', () => {
    const split: Split = {
      id: 'test-8',
      name: 'Test Split',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [
        {
          id: 'item-1',
          name: 'Item 1',
          priceInCents: 1000,
          quantity: 2,
          assignments: [],
        },
        {
          id: 'item-2',
          name: 'Item 2',
          priceInCents: 500,
          quantity: 3,
          assignments: [],
        },
      ],
      participants: [],
      taxInCents: 200,
      tipInCents: 300,
      currentStep: 'receipt',
    };

    const total = getReceiptTotal(split);
    // 1000 * 2 + 500 * 3 + 200 + 300 = 2000 + 1500 + 200 + 300 = 4000
    expect(total).toBe(4000);
    expect(Number.isFinite(total)).toBe(true);
    expect(formatCurrency(total)).toBe('$40.00');
  });
});

describe('formatCurrency', () => {
  it('should return $0.00 for NaN', () => {
    expect(formatCurrency(NaN)).toBe('$0.00');
  });

  it('should return $0.00 for Infinity', () => {
    expect(formatCurrency(Infinity)).toBe('$0.00');
  });

  it('should return $0.00 for -Infinity', () => {
    expect(formatCurrency(-Infinity)).toBe('$0.00');
  });

  it('should format valid numbers correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(100)).toBe('$1.00');
    expect(formatCurrency(1234)).toBe('$12.34');
    expect(formatCurrency(100000)).toBe('$1000.00');
  });
});

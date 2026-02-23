import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSplits, saveSplit } from './storage';
import { Split } from '@/types/split';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Replace global localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('loadSplits - category handling', () => {
    it('should preserve missing category for legacy splits', () => {
      // Create a split without category (old format)
      const oldSplit: Split = {
        id: 'test-1',
        name: 'Test Split',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        items: [],
        participants: [],
        taxInCents: 0,
        tipInCents: 0,
        currentStep: 'receipt',
        // category is missing
      };

      localStorageMock.setItem('receiptsplit:splits', JSON.stringify([oldSplit]));

      const loaded = loadSplits(null);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].category).toBeUndefined();
    });

    it('should preserve existing category', () => {
      const splitWithCategory: Split = {
        id: 'test-2',
        name: 'Test Split',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        items: [],
        participants: [],
        taxInCents: 0,
        tipInCents: 0,
        currentStep: 'receipt',
        category: 'Restaurant',
      };

      localStorageMock.setItem('receiptsplit:splits', JSON.stringify([splitWithCategory]));

      const loaded = loadSplits(null);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].category).toBe('Restaurant');
    });

    it('should preserve missing categories for legacy splits', () => {
      const splits: Split[] = [
        {
          id: 'test-1',
          name: 'Split 1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          items: [],
          participants: [],
          taxInCents: 0,
          tipInCents: 0,
          currentStep: 'receipt',
        },
        {
          id: 'test-2',
          name: 'Split 2',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          items: [],
          participants: [],
          taxInCents: 0,
          tipInCents: 0,
          currentStep: 'receipt',
          category: 'Grocery',
        },
        {
          id: 'test-3',
          name: 'Split 3',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          items: [],
          participants: [],
          taxInCents: 0,
          tipInCents: 0,
          currentStep: 'receipt',
        },
      ];

      localStorageMock.setItem('receiptsplit:splits', JSON.stringify(splits));

      const loaded = loadSplits(null);
      expect(loaded).toHaveLength(3);
      expect(loaded[0].category).toBeUndefined();
      expect(loaded[1].category).toBe('Grocery');
      expect(loaded[2].category).toBeUndefined();
    });

    it('should not crash on empty storage', () => {
      const loaded = loadSplits(null);
      expect(loaded).toEqual([]);
    });

    it('should not crash on invalid JSON', () => {
      localStorageMock.setItem('receiptsplit:splits:anonymous', 'invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const loaded = loadSplits(null);
      expect(loaded).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('saveSplit', () => {
    it('should save split with category', () => {
      const split: Split = {
        id: 'test-1',
        name: 'Test Split',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        items: [],
        participants: [],
        taxInCents: 0,
        tipInCents: 0,
        currentStep: 'receipt',
        category: 'Restaurant',
      };

      saveSplit(split, null);
      const loaded = loadSplits(null);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].category).toBe('Restaurant');
    });
  });

  describe('excludeMe normalization', () => {
    it('should include "me" participant when excludeMe=false (default)', () => {
      const split: Split = {
        id: 'test-exclude-false',
        name: 'Test Split',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        items: [],
        participants: [],
        taxInCents: 0,
        tipInCents: 0,
        currentStep: 'receipt',
        excludeMe: false,
      };

      saveSplit(split, null);
      const loaded = loadSplits(null);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].excludeMe).toBe(false);
      expect(loaded[0].participants).toHaveLength(1);
      expect(loaded[0].participants[0].id).toBe('me');
      expect(loaded[0].participants[0].name).toBe('Me');
    });

    it('should remove "me" participant when excludeMe=true', () => {
      const split: Split = {
        id: 'test-exclude-true',
        name: 'Test Split',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        items: [],
        participants: [{ id: 'me', name: 'Me' }, { id: 'other', name: 'Other' }],
        taxInCents: 0,
        tipInCents: 0,
        currentStep: 'receipt',
        excludeMe: true,
      };

      saveSplit(split, null);
      const loaded = loadSplits(null);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].excludeMe).toBe(true);
      expect(loaded[0].participants).toHaveLength(1);
      expect(loaded[0].participants[0].id).toBe('other');
      expect(loaded[0].participants.some(p => p.id === 'me')).toBe(false);
    });

    it('should migrate legacy splits: set excludeMe=false and add "me" participant', () => {
      const legacySplit: Split = {
        id: 'test-legacy',
        name: 'Legacy Split',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        items: [],
        participants: [{ id: 'other', name: 'Other' }],
        taxInCents: 0,
        tipInCents: 0,
        currentStep: 'receipt',
        // excludeMe is missing
      };

      localStorageMock.setItem('receiptsplit:splits:anonymous', JSON.stringify([legacySplit]));

      const loaded = loadSplits(null);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].excludeMe).toBe(false);
      expect(loaded[0].participants).toHaveLength(2);
      expect(loaded[0].participants.some(p => p.id === 'me' && p.name === 'Me')).toBe(true);
      expect(loaded[0].participants.some(p => p.id === 'other')).toBe(true);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPeople, addPeople, removePerson, clearPeople } from './peopleStorage';

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

describe('peopleStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Replace global localStorage with mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('getPeople', () => {
    it('should return empty array when localStorage is empty', () => {
      expect(getPeople()).toEqual([]);
    });

    it('should return stored people', () => {
      localStorageMock.setItem('receiptsplit:people', JSON.stringify(['Alice', 'Bob']));
      expect(getPeople()).toEqual(['Alice', 'Bob']);
    });

    it('should return empty array on parse error', () => {
      localStorageMock.setItem('receiptsplit:people', 'invalid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(getPeople()).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('addPeople', () => {
    it('should add new people to empty storage', () => {
      addPeople(['Alice', 'Bob']);
      expect(getPeople()).toEqual(['Alice', 'Bob']);
    });

    it('should deduplicate case-insensitively', () => {
      addPeople(['Alice', 'alice', 'ALICE']);
      const people = getPeople();
      expect(people.length).toBe(1);
      expect(people[0]).toBe('ALICE'); // Most recent casing preserved
    });

    it('should preserve most recent casing when deduplicating', () => {
      addPeople(['alice']);
      addPeople(['Alice']);
      addPeople(['ALICE']);
      const people = getPeople();
      expect(people.length).toBe(1);
      expect(people[0]).toBe('ALICE'); // Most recent casing
    });

    it('should merge with existing people', () => {
      addPeople(['Alice', 'Bob']);
      addPeople(['Charlie', 'alice']); // alice updates Alice
      const people = getPeople();
      expect(people.length).toBe(3);
      expect(people).toContain('alice'); // Most recent casing
      expect(people).toContain('Bob');
      expect(people).toContain('Charlie');
    });

    it('should trim whitespace', () => {
      addPeople(['  Alice  ', '  Bob  ']);
      const people = getPeople();
      expect(people).toEqual(['Alice', 'Bob']);
    });

    it('should ignore empty strings', () => {
      addPeople(['Alice', '', '  ', 'Bob']);
      const people = getPeople();
      expect(people).toEqual(['Alice', 'Bob']);
    });

    it('should handle empty array', () => {
      addPeople([]);
      expect(getPeople()).toEqual([]);
    });
  });

  describe('removePerson', () => {
    beforeEach(() => {
      addPeople(['Alice', 'Bob', 'Charlie']);
    });

    it('should remove person case-insensitively', () => {
      removePerson('alice');
      const people = getPeople();
      expect(people).not.toContain('Alice');
      expect(people.length).toBe(2);
    });

    it('should handle non-existent person', () => {
      removePerson('David');
      const people = getPeople();
      expect(people.length).toBe(3);
    });

    it('should trim whitespace before removing', () => {
      removePerson('  bob  ');
      const people = getPeople();
      expect(people).not.toContain('Bob');
    });
  });

  describe('clearPeople', () => {
    it('should clear all stored people', () => {
      addPeople(['Alice', 'Bob']);
      clearPeople();
      expect(getPeople()).toEqual([]);
    });
  });

  describe('Integration: dedupe behavior', () => {
    it('should handle complex deduplication scenario', () => {
      // Add "Alex" in different casings
      addPeople(['Alex']);
      addPeople(['alex']);
      addPeople(['ALEX']);
      
      // Should have only one entry with most recent casing
      const people = getPeople();
      expect(people.length).toBe(1);
      expect(people[0]).toBe('ALEX');
      
      // Adding "Alex" again should update to "Alex"
      addPeople(['Alex']);
      const updated = getPeople();
      expect(updated.length).toBe(1);
      expect(updated[0]).toBe('Alex');
    });

    it('should exclude already-added people from suggestions', () => {
      addPeople(['Alice', 'Bob', 'Charlie']);
      
      // Simulate adding Alice to a split
      const currentParticipants = ['Alice'];
      
      // Available people should exclude Alice
      const available = getPeople().filter(
        name => !currentParticipants.includes(name)
      );
      
      expect(available).toEqual(['Bob', 'Charlie']);
    });
  });
});

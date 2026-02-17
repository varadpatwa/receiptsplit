import { Split, Participant } from '@/types/split';
import { generateId } from './formatting';

const STORAGE_KEY_PREFIX = 'receiptsplit:splits';
const LEGACY_KEY = 'receiptsplit:splits';

function getStorageKey(userId: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

/**
 * Migrate old participant data to new format with IDs
 */
function migrateParticipant(p: unknown): Participant {
  if (p && typeof p === 'object' && 'id' in p && 'name' in p) {
    // Already in new format
    return {
      id: String((p as { id: unknown }).id),
      name: String((p as { name: unknown }).name),
      source: 'source' in p ? (p as { source?: unknown }).source as 'friend' | 'temp' : undefined,
    };
  }
  // Old format: just a string name
  if (typeof p === 'string') {
    return {
      id: generateId(),
      name: p.trim(),
      source: undefined,
    };
  }
  // Fallback
  return {
    id: generateId(),
    name: String(p || 'Unknown'),
    source: undefined,
  };
}

/**
 * Load splits for the given user. userId = null means anonymous (signed out).
 * Migrates legacy key receiptsplit:splits to receiptsplit:splits:anonymous once.
 */
export const loadSplits = (userId: string | null): Split[] => {
  try {
    const key = getStorageKey(userId);
    let stored = localStorage.getItem(key);
    // One-time migration: copy legacy key to anonymous
    if (userId === null && !stored) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        stored = legacy;
      }
    }
    if (!stored) return [];
    const splits = JSON.parse(stored) as Split[];
    
    // Migrate participants if needed
    return splits.map(split => {
      if (!Array.isArray(split.participants)) {
        return split;
      }
      
      const needsMigration = split.participants.some(
        p => typeof p === 'string' || !('id' in p)
      );
      
      if (!needsMigration) {
        return split;
      }
      
      return {
        ...split,
        participants: split.participants.map(migrateParticipant),
      };
    });
  } catch (error) {
    console.error('Failed to load splits:', error);
    return [];
  }
};

export const saveSplits = (splits: Split[], userId: string | null): void => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(splits));
  } catch (error) {
    console.error('Failed to save splits:', error);
  }
};

export const saveSplit = (split: Split, userId: string | null): void => {
  const splits = loadSplits(userId);
  const index = splits.findIndex(s => s.id === split.id);
  
  if (index >= 0) {
    splits[index] = { ...split, updatedAt: Date.now() };
  } else {
    splits.push(split);
  }
  
  saveSplits(splits, userId);
};

export const deleteSplit = (splitId: string, userId: string | null): void => {
  const splits = loadSplits(userId);
  const filtered = splits.filter(s => s.id !== splitId);
  saveSplits(filtered, userId);
};

export const getSplit = (splitId: string, userId: string | null): Split | null => {
  const splits = loadSplits(userId);
  return splits.find(s => s.id === splitId) || null;
};

import { Split, Participant } from '@/types/split';
import { generateId } from './formatting';

const STORAGE_KEY = 'receiptsplit:splits';

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

export const loadSplits = (): Split[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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

export const saveSplits = (splits: Split[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(splits));
  } catch (error) {
    console.error('Failed to save splits:', error);
  }
};

export const saveSplit = (split: Split): void => {
  const splits = loadSplits();
  const index = splits.findIndex(s => s.id === split.id);
  
  if (index >= 0) {
    splits[index] = { ...split, updatedAt: Date.now() };
  } else {
    splits.push(split);
  }
  
  saveSplits(splits);
};

export const deleteSplit = (splitId: string): void => {
  const splits = loadSplits();
  const filtered = splits.filter(s => s.id !== splitId);
  saveSplits(filtered);
};

export const getSplit = (splitId: string): Split | null => {
  const splits = loadSplits();
  return splits.find(s => s.id === splitId) || null;
};

import { Split, Participant } from '@/types/split';
import { generateId } from './formatting';

const STORAGE_KEY_PREFIX = 'receiptsplit:splits';
const LEGACY_KEY = 'receiptsplit:splits';

function getStorageKey(userId: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

const ME_PARTICIPANT_ID = 'me';
const ME_PARTICIPANT_NAME = 'Me';

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
 * Normalize split: ensure excludeMe is set (default false), and "me" participant exists/doesn't exist accordingly.
 */
function normalizeSplit(split: Split): Split {
  const excludeMe = split.excludeMe ?? false;
  const hasMe = split.participants.some(p => p.id === ME_PARTICIPANT_ID);
  
  let participants = [...split.participants];
  
  if (!excludeMe && !hasMe) {
    // Add "me" participant
    participants = [
      { id: ME_PARTICIPANT_ID, name: ME_PARTICIPANT_NAME },
      ...participants,
    ];
  } else if (excludeMe && hasMe) {
    // Remove "me" participant
    participants = participants.filter(p => p.id !== ME_PARTICIPANT_ID);
  }
  
  return {
    ...split,
    excludeMe,
    participants,
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
    
    // Migrate participants and normalize "me" participant
    return splits.map(split => {
      let normalized = split;
      
      // Migrate participants if needed
      if (Array.isArray(split.participants)) {
        const needsMigration = split.participants.some(
          p => typeof p === 'string' || !('id' in p)
        );
        
        if (needsMigration) {
          normalized = {
            ...split,
            participants: split.participants.map(migrateParticipant),
          };
        }
      }
      
      // Normalize excludeMe and "me" participant
      return normalizeSplit(normalized);
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
  const normalized = normalizeSplit(split);
  const splits = loadSplits(userId);
  const index = splits.findIndex(s => s.id === normalized.id);
  
  if (index >= 0) {
    splits[index] = { ...normalized, updatedAt: Date.now() };
  } else {
    splits.push({ ...normalized, updatedAt: Date.now() });
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

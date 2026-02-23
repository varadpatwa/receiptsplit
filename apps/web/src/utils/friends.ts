import { generateId } from './formatting';

const STORAGE_KEY_PREFIX = 'receiptsplit:friends';
const LEGACY_KEY = 'receiptsplit:friends';

function getStorageKey(userId: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

export interface Friend {
  id: string;
  name: string;
}

/**
 * Safe get: never throws. Reads from one storage key per userId.
 * If missing/invalid/non-array → return [].
 * Normalizes to Friend[] (migrates old string[] data).
 * userId = null → anonymous (signed out). Migrates legacy key once.
 */
export function getFriends(userId: string | null): Friend[] {
  let raw: unknown;
  try {
    const key = getStorageKey(userId);
    let stored = localStorage.getItem(key);
    if (userId === null && (stored == null || stored === '')) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        stored = legacy;
      }
    }
    if (stored == null || stored === '') return [];
    raw = JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load friends:', error);
    return [];
  }
  if (!Array.isArray(raw)) return [];
  
  const seen = new Set<string>();
  const result: Friend[] = [];
  
  for (const item of raw) {
    let name = '';
    let id = '';
    
    // Handle old string[] format
    if (typeof item === 'string') {
      name = item.trim();
      if (!name) continue;
      id = generateId(); // Generate new ID for migrated entries
    }
    // Handle Friend[] format
    else if (item && typeof item === 'object' && 'name' in item) {
      name = String((item as { name?: unknown }).name).trim();
      id = 'id' in item && typeof (item as { id?: unknown }).id === 'string' 
        ? (item as { id: string }).id 
        : generateId();
    } else {
      continue;
    }
    
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push({ id, name });
  }
  
  return result;
}

/**
 * Add a friend by name. Trims whitespace, dedupes case-insensitively, ignores empty.
 * Returns the created/updated Friend. userId = null → anonymous.
 */
export function addFriend(name: string, userId: string | null): Friend {
  const trimmed = name.trim();
  if (!trimmed) {
    const existing = getFriends(userId);
    return existing[0] || { id: generateId(), name: '' };
  }

  const current = getFriends(userId);
  const lower = trimmed.toLowerCase();
  const existing = current.find(f => f.name.toLowerCase() === lower);
  if (existing) return existing;

  const friend: Friend = {
    id: generateId(),
    name: trimmed,
  };
  
  const updated = [...current, friend];
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save friends:', error);
  }
  return friend;
}

/**
 * Remove a friend by id. Returns updated list.
 */
export function removeFriend(id: string, userId: string | null): Friend[] {
  const updated = getFriends(userId).filter(f => f.id !== id);
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save friends:', error);
  }
  return getFriends(userId);
}

/**
 * Get friend by name (case-insensitive). Returns undefined if not found.
 */
export function getFriendByName(name: string, userId: string | null): Friend | undefined {
  const trimmed = name.trim().toLowerCase();
  return getFriends(userId).find(f => f.name.toLowerCase() === trimmed);
}

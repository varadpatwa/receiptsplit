const STORAGE_KEY_PREFIX = 'receiptsplit:recentPeople';
const LEGACY_KEY = 'receiptsplit:recentPeople';
const MAX_RECENT = 5;

function getStorageKey(userId: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

/**
 * Get recent people names (capped to 5 most recent). userId = null → anonymous.
 * Never throws; returns [] on error. Migrates legacy key to anonymous once.
 */
export function getRecentPeople(userId: string | null): string[] {
  try {
    const key = getStorageKey(userId);
    let stored = localStorage.getItem(key);
    if (userId === null && !stored) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        localStorage.setItem(key, legacy);
        stored = legacy;
      }
    }
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENT);
  } catch (error) {
    console.error('Failed to load recent people:', error);
    return [];
  }
}

/**
 * Record a person as recent. Pushes to front, dedupes case-insensitively,
 * keeps most recent casing, truncates to MAX_RECENT.
 */
export function recordRecentPerson(name: string, userId: string | null): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  const current = getRecentPeople(userId);
  const lower = trimmed.toLowerCase();
  
  const filtered = current.filter(n => n.toLowerCase() !== lower);
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
  
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent people:', error);
  }
}

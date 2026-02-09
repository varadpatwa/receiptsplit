const STORAGE_KEY = 'receiptsplit:recentPeople';
const MAX_RECENT = 5;

/**
 * Get recent people names (capped to 5 most recent).
 * Never throws; returns [] on error.
 */
export function getRecentPeople(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
export function recordRecentPerson(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  const current = getRecentPeople();
  const lower = trimmed.toLowerCase();
  
  // Remove any existing entry (case-insensitive)
  const filtered = current.filter(n => n.toLowerCase() !== lower);
  
  // Add to front with most recent casing
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent people:', error);
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = 'receiptsplit:recentPeople';
const MAX_RECENT = 5;

function getStorageKey(userId: string | null): string {
  return `${STORAGE_KEY_PREFIX}:${userId ?? 'anonymous'}`;
}

export async function getRecentPeople(userId: string | null): Promise<string[]> {
  try {
    const key = getStorageKey(userId);
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export async function recordRecentPerson(name: string, userId: string | null): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const current = await getRecentPeople(userId);
  const lower = trimmed.toLowerCase();
  const filtered = current.filter((n) => n.toLowerCase() !== lower);
  const updated = [trimmed, ...filtered].slice(0, MAX_RECENT);
  try {
    await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(updated));
  } catch {
    // ignore
  }
}

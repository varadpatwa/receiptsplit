const STORAGE_KEY = 'receiptsplit:friends';

export interface StoredFriend {
  id: string;
  name: string;
  addedAt: number;
}

export function getFriends(): StoredFriend[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load friends:', error);
    return [];
  }
}

export function addFriend(name: string, generateId: () => string): StoredFriend {
  const friends = getFriends();
  const trimmed = name.trim();
  const existing = friends.find(f => f.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  const friend: StoredFriend = {
    id: generateId(),
    name: trimmed,
    addedAt: Date.now(),
  };
  friends.push(friend);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
  return friend;
}

export function removeFriend(id: string): void {
  const friends = getFriends().filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
}

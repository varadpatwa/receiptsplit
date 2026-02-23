const STORAGE_KEY = 'receiptsplit:people';

/**
 * Get all stored people names
 */
export const getPeople = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load people:', error);
    return [];
  }
};

/**
 * Add people names to storage, deduplicating case-insensitively
 * Preserves the most recent casing for each name
 */
export const addPeople = (names: string[]): void => {
  if (names.length === 0) return;
  
  try {
    const existing = getPeople();
    const existingLower = new Map<string, string>();
    
    // Build a map of lowercase -> most recent casing
    existing.forEach(name => {
      existingLower.set(name.toLowerCase(), name);
    });
    
    // Add new names, updating casing if they already exist
    names.forEach(name => {
      const trimmed = name.trim();
      if (trimmed) {
        existingLower.set(trimmed.toLowerCase(), trimmed);
      }
    });
    
    // Convert back to array (preserving most recent casing)
    const updated = Array.from(existingLower.values());
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save people:', error);
  }
};

/**
 * Remove a person from storage (case-insensitive)
 */
export const removePerson = (name: string): void => {
  try {
    const existing = getPeople();
    const filtered = existing.filter(
      n => n.toLowerCase() !== name.trim().toLowerCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove person:', error);
  }
};

/**
 * Clear all stored people
 */
export const clearPeople = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear people:', error);
  }
};

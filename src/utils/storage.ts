import { Split } from '@/types/split';

const STORAGE_KEY = 'receiptsplit:splits';

export const loadSplits = (): Split[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
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

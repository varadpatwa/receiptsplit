import { useState, useEffect, useCallback, useRef } from 'react';
import { Split } from '@/types/split';
import { loadSplits, saveSplit as saveSplitToStorage, deleteSplit as deleteSplitFromStorage } from '@/utils/storage';
import { generateId } from '@/utils/formatting';
import { useAuthUserId } from '@/contexts/AuthContext';

export const useSplits = () => {
  const userId = useAuthUserId();
  const [splits, setSplits] = useState<Split[]>([]);
  const [currentSplit, setCurrentSplit] = useState<Split | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load splits when userId changes (SIGNED_IN / SIGNED_OUT)
  useEffect(() => {
    const loaded = loadSplits(userId);
    setSplits(loaded);
    setCurrentSplit(null);
  }, [userId]);
  
  // Create new split
  const createNewSplit = useCallback((): Split => {
    const newSplit: Split = {
      id: generateId(),
      name: `Split ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
      participants: [],
      taxInCents: 0,
      tipInCents: 0,
      currentStep: 'receipt'
      // category is intentionally undefined - user must select
    };
    
    setCurrentSplit(newSplit);
    return newSplit;
  }, []);
  
  // Load existing split
  const loadSplit = useCallback((splitId: string) => {
    const split = splits.find(s => s.id === splitId);
    if (split) {
      setCurrentSplit(split);
    }
  }, [splits]);
  
  // Save current split with debounce
  const saveSplit = useCallback((split: Split, immediate = false) => {
    setCurrentSplit(split);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    const doSave = () => {
      saveSplitToStorage(split, userId);
      setSplits(prev => {
        const index = prev.findIndex(s => s.id === split.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = split;
          return updated;
        }
        return [...prev, split];
      });
    };
    
    if (immediate) {
      doSave();
    } else {
      // Debounce for 300ms
      saveTimeoutRef.current = setTimeout(doSave, 300);
    }
  }, [userId]);
  
  // Delete split
  const deleteSplit = useCallback((splitId: string) => {
    deleteSplitFromStorage(splitId, userId);
    setSplits(prev => prev.filter(s => s.id !== splitId));
    
    if (currentSplit?.id === splitId) {
      setCurrentSplit(null);
    }
  }, [currentSplit, userId]);
  
  // Update current split
  const updateCurrentSplit = useCallback((updater: (split: Split) => Split) => {
    if (!currentSplit) return;
    
    const updated = updater(currentSplit);
    saveSplit(updated);
  }, [currentSplit, saveSplit]);
  
  // Clear current split
  const clearCurrentSplit = useCallback(() => {
    setCurrentSplit(null);
  }, []);
  
  return {
    splits,
    currentSplit,
    createNewSplit,
    loadSplit,
    saveSplit,
    deleteSplit,
    updateCurrentSplit,
    clearCurrentSplit
  };
};

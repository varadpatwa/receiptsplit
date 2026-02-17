import { useState, useEffect, useCallback, useRef } from 'react';
import { Split } from '@/types/split';
import { generateId } from '@/utils/formatting';
import { useAuthUserId } from '@/contexts/AuthContext';
import { listSplits, createSplit, updateSplit, deleteSplit as deleteSplitFromSupabase } from '@/lib/splits';
import { migrateUserData } from '@/lib/migration';

export const useSplits = () => {
  const userId = useAuthUserId();
  const [splits, setSplits] = useState<Split[]>([]);
  const [currentSplit, setCurrentSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load splits when userId changes (SIGNED_IN / SIGNED_OUT)
  useEffect(() => {
    const loadData = async () => {
      if (!userId) {
        // Signed out - clear splits
        setSplits([]);
        setCurrentSplit(null);
        return;
      }
      
      setLoading(true);
      try {
        // Run migration if needed (one-time per user)
        await migrateUserData(userId);
        
        // Load splits from Supabase
        const loaded = await listSplits();
        setSplits(loaded);
        setCurrentSplit(null);
      } catch (error) {
        console.error('Failed to load splits:', error);
        setSplits([]);
        setCurrentSplit(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [userId]);
  
  // Create new split
  const createNewSplit = useCallback((): Split => {
    const newSplit: Split = {
      id: generateId(),
      name: `Split ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
      participants: [{ id: 'me', name: 'Me' }], // "Me" included by default
      taxInCents: 0,
      tipInCents: 0,
      currentStep: 'receipt',
      excludeMe: false, // Default: include "me"
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
  const saveSplit = useCallback(async (split: Split, immediate = false) => {
    if (!userId) {
      console.warn('Cannot save split: user not signed in');
      return;
    }
    
    setCurrentSplit(split);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    const doSave = async () => {
      try {
        const isNew = !splits.some(s => s.id === split.id);
        const saved = isNew 
          ? await createSplit(split)
          : await updateSplit(split);
        
        setSplits(prev => {
          const index = prev.findIndex(s => s.id === saved.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = saved;
            return updated;
          }
          return [...prev, saved];
        });
      } catch (error) {
        console.error('Failed to save split:', error);
        // Update local state anyway for optimistic UI
        setSplits(prev => {
          const index = prev.findIndex(s => s.id === split.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = split;
            return updated;
          }
          return [...prev, split];
        });
      }
    };
    
    if (immediate) {
      await doSave();
    } else {
      // Debounce for 300ms
      saveTimeoutRef.current = setTimeout(doSave, 300);
    }
  }, [userId, splits]);
  
  // Delete split
  const deleteSplit = useCallback(async (splitId: string) => {
    if (!userId) {
      console.warn('Cannot delete split: user not signed in');
      return;
    }
    
    try {
      await deleteSplitFromSupabase(splitId);
      setSplits(prev => prev.filter(s => s.id !== splitId));
      
      if (currentSplit?.id === splitId) {
        setCurrentSplit(null);
      }
    } catch (error) {
      console.error('Failed to delete split:', error);
      // Optimistically remove from UI anyway
      setSplits(prev => prev.filter(s => s.id !== splitId));
      if (currentSplit?.id === splitId) {
        setCurrentSplit(null);
      }
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
    loading,
    createNewSplit,
    loadSplit,
    saveSplit,
    deleteSplit,
    updateCurrentSplit,
    clearCurrentSplit
  };
};

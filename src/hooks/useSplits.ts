import { useState, useEffect, useCallback, useRef } from 'react';
import { Split } from '@/types/split';
import { generateId, generateUuid } from '@/utils/formatting';
import { useAuth } from '@/contexts/AuthContext';
import { listSplits, createSplit, updateSplit, deleteSplit as deleteSplitFromSupabase } from '@/lib/splits';
import { migrateUserData } from '@/lib/migration';

export const useSplits = () => {
  const { userId, sessionLoaded } = useAuth();
  const [splits, setSplits] = useState<Split[]>([]);
  const [currentSplit, setCurrentSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Wait for auth to be checked before loading/clearing. Prevents wiping data on refresh when session is still restoring.
  useEffect(() => {
    if (!sessionLoaded) return;

    if (!userId) {
      setSplits([]);
      setCurrentSplit(null);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        await migrateUserData(userId);
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
  }, [sessionLoaded, userId]);
  
  // Create new split (id must be UUID if public.splits.id is type uuid)
  const createNewSplit = useCallback((): Split => {
    const newSplit: Split = {
      id: generateUuid(),
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
  
  // Save current split with debounce. Only add to Recent Splits on success; surface error on failure.
  const saveSplit = useCallback(async (split: Split, immediate = false) => {
    if (!userId) {
      console.warn('Cannot save split: user not signed in');
      setSaveError('You must be signed in to save.');
      return;
    }

    setSaveError(null);
    setCurrentSplit(split);

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
        const message = error instanceof Error ? error.message : 'Failed to save split';
        console.error('Failed to save split:', error);
        setSaveError(message);
        // Do not add to splits list on failure so UI does not show unsynced data as success
      }
    };

    if (immediate) {
      await doSave();
    } else {
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
  
  // Update current split. Pass immediate=true when navigating so data is persisted before next screen/refresh.
  const updateCurrentSplit = useCallback((updater: (split: Split) => Split, immediate = false) => {
    if (!currentSplit) return;
    const updated = updater(currentSplit);
    saveSplit(updated, immediate);
  }, [currentSplit, saveSplit]);
  
  // Clear current split
  const clearCurrentSplit = useCallback(() => {
    setCurrentSplit(null);
  }, []);
  
  return {
    splits,
    currentSplit,
    loading,
    saveError,
    clearSaveError: useCallback(() => setSaveError(null), []),
    createNewSplit,
    loadSplit,
    saveSplit,
    deleteSplit,
    updateCurrentSplit,
    clearCurrentSplit
  };
};

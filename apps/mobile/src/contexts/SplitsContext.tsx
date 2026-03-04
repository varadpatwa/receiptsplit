import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Split } from '@receiptsplit/shared';
import { generateUuid } from '@receiptsplit/shared';
import { useAuth } from './AuthContext';
import { listSplits, createSplit, updateSplit, deleteSplit as deleteSplitFromSupabase } from '../lib/splits';

type SplitsContextValue = {
  splits: Split[];
  currentSplit: Split | null;
  loading: boolean;
  saveError: string | null;
  clearSaveError: () => void;
  refetch: () => Promise<void>;
  createNewSplit: () => Split;
  loadSplit: (splitId: string) => void;
  saveSplit: (split: Split, immediate?: boolean) => Promise<void>;
  deleteSplit: (splitId: string) => Promise<void>;
  updateCurrentSplit: (updater: (split: Split) => Split, immediate?: boolean) => void;
  clearCurrentSplit: () => void;
};

const SplitsContext = createContext<SplitsContextValue | null>(null);

export function SplitsProvider({ children }: { children: React.ReactNode }) {
  const { userId, sessionLoaded } = useAuth();
  const [splits, setSplits] = useState<Split[]>([]);
  const [currentSplit, setCurrentSplit] = useState<Split | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const loaded = await listSplits();
      setSplits(loaded);
    } catch {
      setSplits([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!sessionLoaded) return;
    if (!userId) {
      setSplits([]);
      setCurrentSplit(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listSplits()
      .then((loaded) => {
        if (!cancelled) {
          setSplits(loaded);
          setCurrentSplit(null);
        }
      })
      .catch(() => {
        if (!cancelled) setSplits([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionLoaded, userId]);

  const createNewSplit = useCallback((): Split => {
    const newSplit: Split = {
      id: generateUuid(),
      name: `Split ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      items: [],
      participants: [{ id: 'me', name: 'Me' }],
      taxInCents: 0,
      tipInCents: 0,
      currentStep: 'receipt',
      excludeMe: false,
    };
    setCurrentSplit(newSplit);
    return newSplit;
  }, []);

  const loadSplit = useCallback((splitId: string) => {
    const split = splits.find((s) => s.id === splitId);
    if (split) setCurrentSplit(split);
  }, [splits]);

  const saveSplit = useCallback(
    async (split: Split, immediate = false) => {
      if (!userId) {
        setSaveError('You must be signed in to save.');
        return;
      }
      setSaveError(null);
      setCurrentSplit(split);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      const doSave = async (): Promise<void> => {
        const isNew = !splits.some((s) => s.id === split.id);
        try {
          const saved = isNew ? await createSplit(split) : await updateSplit(split);
          setSplits((prev) => {
            const idx = prev.findIndex((s) => s.id === saved.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = saved;
              return next;
            }
            return [saved, ...prev];
          });
          if (isNew) setCurrentSplit(saved);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to save split';
          setSaveError(msg);
          throw e;
        }
      };

      if (immediate) {
        await doSave();
      } else {
        saveTimeoutRef.current = setTimeout(() => doSave().catch(() => {}), 300);
      }
    },
    [userId, splits]
  );

  const deleteSplit = useCallback(
    async (splitId: string) => {
      if (!userId) return;
      try {
        await deleteSplitFromSupabase(splitId);
        setSplits((prev) => prev.filter((s) => s.id !== splitId));
        if (currentSplit?.id === splitId) setCurrentSplit(null);
      } catch {
        setSplits((prev) => prev.filter((s) => s.id !== splitId));
        if (currentSplit?.id === splitId) setCurrentSplit(null);
      }
    },
    [userId, currentSplit?.id]
  );

  const updateCurrentSplit = useCallback(
    (updater: (split: Split) => Split, immediate = false) => {
      if (!currentSplit) return;
      saveSplit(updater(currentSplit), immediate);
    },
    [currentSplit, saveSplit]
  );

  const clearCurrentSplit = useCallback(() => setCurrentSplit(null), []);

  const value: SplitsContextValue = {
    splits,
    currentSplit,
    loading,
    saveError,
    clearSaveError: useCallback(() => setSaveError(null), []),
    refetch,
    createNewSplit,
    loadSplit,
    saveSplit,
    deleteSplit,
    updateCurrentSplit,
    clearCurrentSplit,
  };

  return <SplitsContext.Provider value={value}>{children}</SplitsContext.Provider>;
}

export function useSplits(): SplitsContextValue {
  const ctx = useContext(SplitsContext);
  if (!ctx) throw new Error('useSplits must be used within SplitsProvider');
  return ctx;
}

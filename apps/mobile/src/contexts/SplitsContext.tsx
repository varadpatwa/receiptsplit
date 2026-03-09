import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Split } from '@receiptsplit/shared';
import { generateUuid, generateAutoTitle } from '@receiptsplit/shared';
import { useAuth } from './AuthContext';
import { listSplits, createSplit, updateSplit, softDeleteSplit, restoreSplit as restoreSplitApi } from '../lib/splits';

const PENDING_GUEST_SPLIT_KEY = 'pendingGuestSplit';

type SplitsContextValue = {
  /** All splits including soft-deleted (for spending calculations). */
  splits: Split[];
  /** Active (non-deleted) splits for display in Recent Splits. */
  activeSplits: Split[];
  currentSplit: Split | null;
  loading: boolean;
  saveError: string | null;
  isGuest: boolean;
  clearSaveError: () => void;
  refetch: () => Promise<void>;
  createNewSplit: () => Split;
  loadSplit: (splitId: string) => void;
  saveSplit: (split: Split, immediate?: boolean) => Promise<void>;
  deleteSplit: (splitId: string) => Promise<void>;
  restoreSplit: (splitId: string) => Promise<void>;
  updateCurrentSplit: (updater: (split: Split) => Split, immediate?: boolean) => void;
  clearCurrentSplit: () => void;
  markSplitForUpgrade: (splitId: string) => Promise<void>;
};

const SplitsContext = createContext<SplitsContextValue | null>(null);

export function SplitsProvider({ children }: { children: React.ReactNode }) {
  const { userId, sessionLoaded } = useAuth();
  const isGuest = !userId;
  const [splits, setSplitsState] = useState<Split[]>([]);
  const [guestSplits, setGuestSplits] = useState<Split[]>([]);
  const [currentSplit, setCurrentSplitState] = useState<Split | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs that stay in sync — updated both during render AND imperatively
  const currentSplitRef = useRef<Split | null>(null);
  const splitsRef = useRef<Split[]>([]);

  // Keep refs in sync during render
  currentSplitRef.current = currentSplit;
  splitsRef.current = splits;

  // Wrappers that update both state AND ref synchronously
  const setCurrentSplit = useCallback((s: Split | null) => {
    currentSplitRef.current = s;
    setCurrentSplitState(s);
  }, []);

  const setSplits = useCallback((updater: Split[] | ((prev: Split[]) => Split[])) => {
    if (typeof updater === 'function') {
      setSplitsState((prev) => {
        const next = updater(prev);
        splitsRef.current = next;
        return next;
      });
    } else {
      splitsRef.current = updater;
      setSplitsState(updater);
    }
  }, []);

  // Upgrade pending guest split when user logs in
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_GUEST_SPLIT_KEY);
        if (!raw) return;
        await AsyncStorage.removeItem(PENDING_GUEST_SPLIT_KEY);
        const guestSplit: Split = JSON.parse(raw);
        if (cancelled) return;
        const saved = await createSplit(guestSplit);
        setSplits((prev) => [saved, ...prev]);
      } catch {
        // non-fatal
      }
    })();
    return () => { cancelled = true; };
  }, [userId, setSplits]);

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
  }, [userId, setSplits]);

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
  }, [sessionLoaded, userId, setSplits, setCurrentSplit]);

  const createNewSplit = useCallback((): Split => {
    const now = Date.now();
    const autoTitle = generateAutoTitle({ createdAt: now });
    const newSplit: Split = {
      id: generateUuid(),
      name: autoTitle,
      createdAt: now,
      updatedAt: now,
      items: [],
      participants: [{ id: 'me', name: 'Me' }],
      taxInCents: 0,
      tipInCents: 0,
      currentStep: 'receipt',
      excludeMe: false,
      titleAuto: autoTitle,
      titleUserOverride: false,
    };
    setCurrentSplit(newSplit);
    return newSplit;
  }, [setCurrentSplit]);

  const loadSplit = useCallback((splitId: string) => {
    const allSplits = isGuest ? guestSplits : splitsRef.current;
    const split = allSplits.find((s) => s.id === splitId);
    if (split) setCurrentSplit(split);
  }, [guestSplits, isGuest, setCurrentSplit]);

  const saveSplit = useCallback(
    async (split: Split, immediate = false) => {
      setSaveError(null);
      setCurrentSplit(split);

      // Guest mode: store in-memory only
      if (isGuest) {
        setGuestSplits((prev) => {
          const idx = prev.findIndex((s) => s.id === split.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = split;
            return next;
          }
          return [split, ...prev];
        });
        return;
      }

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      const doSave = async (): Promise<void> => {
        const isNew = !splitsRef.current.some((s) => s.id === split.id);
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
    [isGuest, setCurrentSplit, setSplits]
  );

  const deleteSplit = useCallback(
    async (splitId: string) => {
      if (isGuest) {
        setGuestSplits((prev) => prev.filter((s) => s.id !== splitId));
        if (currentSplitRef.current?.id === splitId) setCurrentSplit(null);
        return;
      }
      // Optimistic: mark as deleted locally
      setSplits((prev) =>
        prev.map((s) => (s.id === splitId ? { ...s, isDeleted: true } : s))
      );
      if (currentSplitRef.current?.id === splitId) setCurrentSplit(null);
      try {
        await softDeleteSplit(splitId);
      } catch {
        // Already marked locally; will sync on next refetch
      }
    },
    [isGuest, setCurrentSplit, setSplits]
  );

  const restoreSplit = useCallback(
    async (splitId: string) => {
      if (isGuest) return;
      // Optimistic: mark as not deleted locally
      setSplits((prev) =>
        prev.map((s) => (s.id === splitId ? { ...s, isDeleted: false } : s))
      );
      try {
        await restoreSplitApi(splitId);
      } catch {
        // Revert on failure
        setSplits((prev) =>
          prev.map((s) => (s.id === splitId ? { ...s, isDeleted: true } : s))
        );
      }
    },
    [isGuest, setSplits]
  );

  const markSplitForUpgrade = useCallback(async (splitId: string) => {
    const latest = currentSplitRef.current;
    const allSplits = [...guestSplits, ...(latest ? [latest] : [])];
    const split = allSplits.find((s) => s.id === splitId);
    if (split) {
      await AsyncStorage.setItem(PENDING_GUEST_SPLIT_KEY, JSON.stringify(split));
    }
  }, [guestSplits]);

  const effectiveSplits = isGuest ? guestSplits : splits;
  const activeSplits = effectiveSplits.filter((s) => !s.isDeleted);

  const updateCurrentSplit = useCallback(
    (updater: (split: Split) => Split, immediate = false) => {
      const latest = currentSplitRef.current;
      if (!latest) return;
      saveSplit(updater(latest), immediate);
    },
    [saveSplit]
  );

  const clearCurrentSplit = useCallback(() => setCurrentSplit(null), [setCurrentSplit]);

  const value: SplitsContextValue = {
    splits: effectiveSplits,
    activeSplits,
    currentSplit,
    loading,
    saveError,
    isGuest,
    clearSaveError: useCallback(() => setSaveError(null), []),
    refetch,
    createNewSplit,
    loadSplit,
    saveSplit,
    deleteSplit,
    restoreSplit,
    updateCurrentSplit,
    clearCurrentSplit,
    markSplitForUpgrade,
  };

  return <SplitsContext.Provider value={value}>{children}</SplitsContext.Provider>;
}

export function useSplits(): SplitsContextValue {
  const ctx = useContext(SplitsContext);
  if (!ctx) throw new Error('useSplits must be used within SplitsProvider');
  return ctx;
}

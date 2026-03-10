import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { SplitEvent, Participant, Split, Item } from '@receiptsplit/shared';
import { generateUuid, generateAutoTitle, generateEventTitle } from '@receiptsplit/shared';
import { createEvent, addSplitToEvent, removeSplitFromEvent } from '../lib/events';
import { useSplits } from './SplitsContext';

/** Data from the capture screen for each scanned receipt */
export interface CapturedReceiptData {
  id: string;
  localUri: string;
  storagePath: string;
  merchantName?: string;
  items: Item[];
  taxInCents: number;
  tipInCents: number;
  total: number;
}

interface MultiSplitContextValue {
  currentEvent: SplitEvent | null;
  sharedParticipants: Participant[];
  eventSplits: Split[];

  /** New flow: create event + splits from captured receipt photos */
  createFromCaptures: (captures: CapturedReceiptData[]) => Promise<SplitEvent>;
  setSharedParticipants: (p: Participant[]) => void;
  /** Sync shared participants to all event splits */
  syncParticipantsToSplits: () => Promise<void>;
  /** Sequential assign flow */
  assignQueueIndex: number | null;
  startAssignFlow: () => void;
  advanceAssignFlow: () => number | null;
  cancelAssignFlow: () => void;
  /** Add another receipt to an existing event (from hub) */
  addReceipt: () => Promise<Split>;
  removeReceipt: (splitId: string) => Promise<void>;
  loadMultiSplit: (event: SplitEvent) => void;
  clearMultiSplit: () => void;
}

const MultiSplitContext = createContext<MultiSplitContextValue | null>(null);

export function MultiSplitProvider({ children }: { children: React.ReactNode }) {
  const { activeSplits, createNewSplit, saveSplit } = useSplits();
  const [currentEvent, setCurrentEvent] = useState<SplitEvent | null>(null);
  const [sharedParticipants, setSharedParticipants] = useState<Participant[]>([]);
  const [assignQueueIndex, setAssignQueueIndex] = useState<number | null>(null);

  const eventSplits = useMemo(() => {
    if (!currentEvent) return [];
    return currentEvent.splitIds
      .map((id) => activeSplits.find((s) => s.id === id))
      .filter((s): s is Split => !!s);
  }, [currentEvent, activeSplits]);

  const createFromCaptures = useCallback(async (captures: CapturedReceiptData[]) => {
    // Auto-generate event title from merchant names
    const title = generateEventTitle(captures.map((c) => c.merchantName));
    const event = await createEvent(title);
    const splitIds: string[] = [];

    for (let i = 0; i < captures.length; i++) {
      const cap = captures[i];
      const splitId = generateUuid();
      const autoTitle = generateAutoTitle({ merchantName: cap.merchantName, createdAt: Date.now() });
      const split: Split = {
        id: splitId,
        name: cap.merchantName
          ? cap.merchantName.split(/\s+/).slice(0, 2).join(' ')
          : `Receipt ${i + 1}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        items: cap.items,
        participants: [{ id: 'me', name: 'Me' }],
        taxInCents: cap.taxInCents,
        tipInCents: cap.tipInCents,
        currentStep: 'receipt',
        excludeMe: false,
        receiptImagePath: cap.storagePath,
        merchantName: cap.merchantName,
        titleAuto: autoTitle,
        titleUserOverride: false,
      };
      await saveSplit(split, true);
      await addSplitToEvent(event.id, split.id);
      splitIds.push(split.id);
    }

    const fullEvent: SplitEvent = { ...event, splitIds };
    setCurrentEvent(fullEvent);
    setSharedParticipants([{ id: 'me', name: 'Me' }]);
    return fullEvent;
  }, [saveSplit]);

  const syncParticipantsToSplits = useCallback(async () => {
    if (!currentEvent) return;
    for (const split of eventSplits) {
      await saveSplit({ ...split, participants: [...sharedParticipants], updatedAt: Date.now() }, true);
    }
  }, [currentEvent, eventSplits, sharedParticipants, saveSplit]);

  const startAssignFlow = useCallback(() => {
    setAssignQueueIndex(0);
  }, []);

  const advanceAssignFlow = useCallback((): number | null => {
    const nextIndex = (assignQueueIndex ?? 0) + 1;
    if (nextIndex >= eventSplits.length) {
      setAssignQueueIndex(null);
      return null;
    }
    setAssignQueueIndex(nextIndex);
    return nextIndex;
  }, [assignQueueIndex, eventSplits.length]);

  const cancelAssignFlow = useCallback(() => {
    setAssignQueueIndex(null);
  }, []);

  const addReceipt = useCallback(async () => {
    if (!currentEvent) throw new Error('No active multi-split');
    const split = createNewSplit();
    const existingCategory = eventSplits.length > 0 ? eventSplits[0].category : undefined;
    const patched: Split = {
      ...split,
      participants: [...sharedParticipants],
      name: `${currentEvent.title} #${currentEvent.splitIds.length + 1}`,
      ...(existingCategory ? { category: existingCategory } : {}),
    };
    await saveSplit(patched, true);
    await addSplitToEvent(currentEvent.id, patched.id);
    setCurrentEvent((prev) =>
      prev ? { ...prev, splitIds: [...prev.splitIds, patched.id] } : prev
    );
    return patched;
  }, [currentEvent, sharedParticipants, eventSplits, createNewSplit, saveSplit]);

  const removeReceipt = useCallback(async (splitId: string) => {
    if (!currentEvent) return;
    await removeSplitFromEvent(currentEvent.id, splitId);
    setCurrentEvent((prev) =>
      prev ? { ...prev, splitIds: prev.splitIds.filter((id) => id !== splitId) } : prev
    );
  }, [currentEvent]);

  const loadMultiSplit = useCallback((event: SplitEvent) => {
    setCurrentEvent(event);
    const firstSplit = activeSplits.find((s) => event.splitIds.includes(s.id));
    if (firstSplit) {
      setSharedParticipants(firstSplit.participants);
    } else {
      setSharedParticipants([{ id: 'me', name: 'Me' }]);
    }
  }, [activeSplits]);

  const clearMultiSplit = useCallback(() => {
    setCurrentEvent(null);
    setSharedParticipants([]);
  }, []);

  const value = useMemo(
    () => ({
      currentEvent,
      sharedParticipants,
      eventSplits,
      createFromCaptures,
      setSharedParticipants,
      syncParticipantsToSplits,
      assignQueueIndex,
      startAssignFlow,
      advanceAssignFlow,
      cancelAssignFlow,
      addReceipt,
      removeReceipt,
      loadMultiSplit,
      clearMultiSplit,
    }),
    [currentEvent, sharedParticipants, eventSplits, createFromCaptures, syncParticipantsToSplits, assignQueueIndex, startAssignFlow, advanceAssignFlow, cancelAssignFlow, addReceipt, removeReceipt, loadMultiSplit, clearMultiSplit]
  );

  return (
    <MultiSplitContext.Provider value={value}>
      {children}
    </MultiSplitContext.Provider>
  );
}

export function useMultiSplit() {
  const ctx = useContext(MultiSplitContext);
  if (!ctx) throw new Error('useMultiSplit must be used within MultiSplitProvider');
  return ctx;
}

/** Safe version that returns null when outside provider (e.g. guest mode) */
export function useMultiSplitSafe() {
  return useContext(MultiSplitContext);
}

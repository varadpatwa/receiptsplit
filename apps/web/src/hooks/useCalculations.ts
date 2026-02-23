import { useMemo } from 'react';
import { Split, ParticipantBreakdown } from '@/types/split';
import { calculateBreakdown, getReceiptTotal, verifyReconciliation, generateShareableText } from '@/utils/calculations';

/**
 * Safely converts a value to a finite number, defaulting to 0 if invalid
 */
const safeNumber = (value: number | undefined | null): number => {
  if (value == null || !Number.isFinite(value)) {
    return 0;
  }
  return value;
};

export const useCalculations = (split: Split | null) => {
  const breakdowns = useMemo<ParticipantBreakdown[]>(() => {
    if (!split) return [];
    return calculateBreakdown(split);
  }, [split]);
  
  const receiptTotal = useMemo(() => {
    if (!split) return 0;
    return getReceiptTotal(split);
  }, [split]);
  
  const itemsSubtotal = useMemo(() => {
    if (!split) return 0;
    const total = split.items.reduce((sum, item) => {
      return sum + (safeNumber(item.priceInCents) * safeNumber(item.quantity));
    }, 0);
    return Number.isFinite(total) ? total : 0;
  }, [split]);
  
  const isReconciled = useMemo(() => {
    if (!split) return false;
    return verifyReconciliation(split, breakdowns);
  }, [split, breakdowns]);
  
  const shareableText = useMemo(() => {
    if (!split) return '';
    return generateShareableText(split, breakdowns);
  }, [split, breakdowns]);
  
  // Check if all items are assigned
  const allItemsAssigned = useMemo(() => {
    if (!split) return false;
    return split.items.every(item => item.assignments.length > 0);
  }, [split]);
  
  // Get running tally (per-participant subtotals) for assign screen
  const runningTally = useMemo(() => {
    if (!split) return new Map<string, number>();
    
    const tally = new Map<string, number>();
    
    split.participants.forEach(p => tally.set(p.id, 0));
    
    split.items.forEach(item => {
      if (item.assignments.length === 0) return;
      
      const totalCost = safeNumber(item.priceInCents) * safeNumber(item.quantity);
      const totalShares = item.assignments.reduce((sum, a) => sum + safeNumber(a.shares), 0);
      
      if (totalShares === 0) return;
      
      item.assignments.forEach(assignment => {
        const share = (totalCost * safeNumber(assignment.shares)) / totalShares;
        const current = tally.get(assignment.participantId) || 0;
        const newValue = current + share;
        tally.set(assignment.participantId, Number.isFinite(newValue) ? newValue : current);
      });
    });
    
    return tally;
  }, [split]);
  
  return {
    breakdowns,
    receiptTotal,
    itemsSubtotal,
    isReconciled,
    shareableText,
    allItemsAssigned,
    runningTally
  };
};

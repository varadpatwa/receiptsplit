import { getReceiptTotal as getReceiptTotalShared } from '@receiptsplit/shared';
import { Split, ParticipantBreakdown, Item } from '@/types/split';

/**
 * Safely converts a value to a finite number, defaulting to 0 if invalid
 */
const safeNumber = (value: number | undefined | null): number => {
  if (value == null || !Number.isFinite(value)) {
    return 0;
  }
  return value;
};

/**
 * Distributes remainder cents by participantId in ascending order
 */
const distributeRemainder = (
  amounts: Map<string, number>,
  remainder: number,
  participantIds: string[]
): void => {
  const sortedIds = [...participantIds].sort();
  let remainingCents = remainder;
  
  for (const id of sortedIds) {
    if (remainingCents <= 0) break;
    amounts.set(id, (amounts.get(id) || 0) + 1);
    remainingCents--;
  }
};

/**
 * Calculate per-participant item costs
 */
const calculateItemCosts = (
  split: Split
): Map<string, number> => {
  const costs = new Map<string, number>();
  
  // Initialize all participants with 0
  split.participants.forEach(p => costs.set(p.id, 0));
  
  split.items.forEach(item => {
    if (item.assignments.length === 0) return;
    
    const totalCost = safeNumber(item.priceInCents) * safeNumber(item.quantity);
    const totalShares = item.assignments.reduce((sum, a) => sum + safeNumber(a.shares), 0);
    
    if (totalShares === 0) return;
    
    const costPerShare = Math.floor(totalCost / totalShares);
    const remainder = totalCost - (costPerShare * totalShares);
    
    // Allocate base amount
    item.assignments.forEach(assignment => {
      const current = costs.get(assignment.participantId) || 0;
      costs.set(assignment.participantId, current + (costPerShare * assignment.shares));
    });
    
    // Distribute remainder cents
    if (remainder > 0) {
      const assignedParticipantIds = item.assignments.map(a => a.participantId);
      distributeRemainder(costs, remainder, assignedParticipantIds);
    }
  });
  
  return costs;
};

/**
 * Calculate per-participant tax and tip
 */
const calculateTaxAndTip = (
  split: Split,
  itemCosts: Map<string, number>
): { tax: Map<string, number>; tip: Map<string, number> } => {
  const taxMap = new Map<string, number>();
  const tipMap = new Map<string, number>();
  
  // Initialize all participants
  split.participants.forEach(p => {
    taxMap.set(p.id, 0);
    tipMap.set(p.id, 0);
  });
  
  const totalItemCost = Array.from(itemCosts.values()).reduce((sum, cost) => sum + cost, 0);
  
  // If no items or all costs are zero, return zeros
  if (totalItemCost === 0) {
    return { tax: taxMap, tip: tipMap };
  }
  
  // Allocate tax proportionally
  const safeTax = safeNumber(split.taxInCents);
  if (safeTax > 0) {
    let remainingTax = safeTax;
    
    split.participants.forEach(p => {
      const itemCost = itemCosts.get(p.id) || 0;
      const proportionalTax = Math.floor((itemCost * safeTax) / totalItemCost);
      taxMap.set(p.id, proportionalTax);
      remainingTax -= proportionalTax;
    });
    
    // Distribute remainder
    if (remainingTax > 0) {
      distributeRemainder(taxMap, remainingTax, split.participants.map(p => p.id));
    }
  }
  
  // Allocate tip proportionally
  const safeTip = safeNumber(split.tipInCents);
  if (safeTip > 0) {
    let remainingTip = safeTip;
    
    split.participants.forEach(p => {
      const itemCost = itemCosts.get(p.id) || 0;
      const proportionalTip = Math.floor((itemCost * safeTip) / totalItemCost);
      tipMap.set(p.id, proportionalTip);
      remainingTip -= proportionalTip;
    });
    
    // Distribute remainder
    if (remainingTip > 0) {
      distributeRemainder(tipMap, remainingTip, split.participants.map(p => p.id));
    }
  }
  
  return { tax: taxMap, tip: tipMap };
};

/**
 * Calculate complete breakdown for all participants
 */
export const calculateBreakdown = (split: Split): ParticipantBreakdown[] => {
  const itemCosts = calculateItemCosts(split);
  const { tax, tip } = calculateTaxAndTip(split, itemCosts);
  
  const breakdowns: ParticipantBreakdown[] = split.participants.map(participant => {
    const participantItemCost = itemCosts.get(participant.id) || 0;
    const participantTax = tax.get(participant.id) || 0;
    const participantTip = tip.get(participant.id) || 0;
    
    // Get itemized costs for this participant
    const itemizedCosts: { itemName: string; amount: number }[] = [];
    
    split.items.forEach(item => {
      const assignment = item.assignments.find(a => a.participantId === participant.id);
      if (!assignment) return;
      
      const totalCost = safeNumber(item.priceInCents) * safeNumber(item.quantity);
      const totalShares = item.assignments.reduce((sum, a) => sum + safeNumber(a.shares), 0);
      
      if (totalShares === 0) return;
      
      const costPerShare = Math.floor(totalCost / totalShares);
      const participantItemAmount = costPerShare * assignment.shares;
      
      // Note: This is a simplified itemization that doesn't account for remainder distribution
      // For exact amounts, we'd need more complex tracking
      itemizedCosts.push({
        itemName: item.name || 'Unnamed item',
        amount: participantItemAmount
      });
    });
    
    return {
      participantId: participant.id,
      participantName: participant.name,
      itemsTotal: participantItemCost,
      taxTotal: participantTax,
      tipTotal: participantTip,
      grandTotal: participantItemCost + participantTax + participantTip,
      items: itemizedCosts
    };
  });
  
  return breakdowns;
};

/** Re-export from shared for use in breakdown/verify/shareable; same logic as shared getReceiptTotal */
export const getReceiptTotal = getReceiptTotalShared;

/**
 * Verify that breakdown totals match receipt total
 */
export const verifyReconciliation = (split: Split, breakdowns: ParticipantBreakdown[]): boolean => {
  const receiptTotal = getReceiptTotal(split);
  const breakdownTotal = breakdowns.reduce((sum, b) => sum + b.grandTotal, 0);
  
  return receiptTotal === breakdownTotal;
};

/**
 * Generate shareable text breakdown
 */
export const generateShareableText = (split: Split, breakdowns: ParticipantBreakdown[]): string => {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  let text = `💰 ${split.name || 'Split Summary'}\n\n`;
  
  breakdowns.forEach(breakdown => {
    text += `${breakdown.participantName}:\n`;
    breakdown.items.forEach(item => {
      text += `  ${item.itemName}: ${formatCurrency(item.amount)}\n`;
    });
    if (breakdown.taxTotal > 0) {
      text += `  Tax: ${formatCurrency(breakdown.taxTotal)}\n`;
    }
    if (breakdown.tipTotal > 0) {
      text += `  Tip: ${formatCurrency(breakdown.tipTotal)}\n`;
    }
    text += `  Total: ${formatCurrency(breakdown.grandTotal)}\n\n`;
  });
  
  text += `Receipt Total: ${formatCurrency(getReceiptTotal(split))}`;
  
  return text;
};

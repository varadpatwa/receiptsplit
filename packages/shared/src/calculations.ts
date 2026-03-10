import type { Split, ParticipantBreakdown, ItemAssignment } from './types.js';
import { getReceiptTotal } from './receiptTotal.js';

const safeNumber = (value: number | undefined | null): number => {
  if (value == null || !Number.isFinite(value)) return 0;
  return value;
};

function distributeRemainder(
  amounts: Map<string, number>,
  remainder: number,
  participantIds: string[]
): void {
  const sortedIds = [...participantIds].sort();
  let remainingCents = remainder;
  for (const id of sortedIds) {
    if (remainingCents <= 0) break;
    amounts.set(id, (amounts.get(id) || 0) + 1);
    remainingCents--;
  }
}

function calculateItemCosts(split: Split): Map<string, number> {
  const costs = new Map<string, number>();
  split.participants.forEach((p) => costs.set(p.id, 0));
  split.items.forEach((item) => {
    if (item.assignments.length === 0) return;
    const totalCost = safeNumber(item.priceInCents) * safeNumber(item.quantity);
    const totalShares = item.assignments.reduce((sum, a) => sum + safeNumber(a.shares), 0);
    if (totalShares === 0) return;
    const costPerShare = Math.floor(totalCost / totalShares);
    const remainder = totalCost - costPerShare * totalShares;
    item.assignments.forEach((assignment) => {
      const current = costs.get(assignment.participantId) || 0;
      costs.set(assignment.participantId, current + costPerShare * assignment.shares);
    });
    if (remainder > 0) {
      distributeRemainder(costs, remainder, item.assignments.map((a) => a.participantId));
    }
  });
  return costs;
}

function calculateTaxAndTip(
  split: Split,
  itemCosts: Map<string, number>
): { tax: Map<string, number>; tip: Map<string, number> } {
  const taxMap = new Map<string, number>();
  const tipMap = new Map<string, number>();
  split.participants.forEach((p) => {
    taxMap.set(p.id, 0);
    tipMap.set(p.id, 0);
  });
  const totalItemCost = Array.from(itemCosts.values()).reduce((sum, cost) => sum + cost, 0);
  if (totalItemCost === 0) return { tax: taxMap, tip: tipMap };
  const safeTax = safeNumber(split.taxInCents);
  if (safeTax > 0) {
    let remainingTax = safeTax;
    split.participants.forEach((p) => {
      const itemCost = itemCosts.get(p.id) || 0;
      const proportionalTax = Math.floor((itemCost * safeTax) / totalItemCost);
      taxMap.set(p.id, proportionalTax);
      remainingTax -= proportionalTax;
    });
    if (remainingTax > 0) distributeRemainder(taxMap, remainingTax, split.participants.map((p) => p.id));
  }
  const safeTip = safeNumber(split.tipInCents);
  if (safeTip > 0) {
    let remainingTip = safeTip;
    split.participants.forEach((p) => {
      const itemCost = itemCosts.get(p.id) || 0;
      const proportionalTip = Math.floor((itemCost * safeTip) / totalItemCost);
      tipMap.set(p.id, proportionalTip);
      remainingTip -= proportionalTip;
    });
    if (remainingTip > 0) distributeRemainder(tipMap, remainingTip, split.participants.map((p) => p.id));
  }
  return { tax: taxMap, tip: tipMap };
}

export function calculateBreakdown(split: Split): ParticipantBreakdown[] {
  const itemCosts = calculateItemCosts(split);
  const { tax, tip } = calculateTaxAndTip(split, itemCosts);
  const breakdowns: ParticipantBreakdown[] = split.participants.map((participant) => {
    const participantItemCost = itemCosts.get(participant.id) || 0;
    const participantTax = tax.get(participant.id) || 0;
    const participantTip = tip.get(participant.id) || 0;
    const itemizedCosts: { itemName: string; amount: number }[] = [];
    split.items.forEach((item) => {
      const assignment = item.assignments.find((a) => a.participantId === participant.id);
      if (!assignment) return;
      const totalCost = safeNumber(item.priceInCents) * safeNumber(item.quantity);
      const totalShares = item.assignments.reduce((sum, a) => sum + safeNumber(a.shares), 0);
      if (totalShares === 0) return;
      const costPerShare = Math.floor(totalCost / totalShares);
      itemizedCosts.push({
        itemName: item.name || 'Unnamed item',
        amount: costPerShare * assignment.shares,
      });
    });
    return {
      participantId: participant.id,
      participantName: participant.name,
      itemsTotal: participantItemCost,
      taxTotal: participantTax,
      tipTotal: participantTip,
      grandTotal: participantItemCost + participantTax + participantTip,
      items: itemizedCosts,
    };
  });
  return breakdowns;
}

export function verifyReconciliation(split: Split, breakdowns: ParticipantBreakdown[]): boolean {
  const receiptTotal = getReceiptTotal(split);
  const breakdownTotal = breakdowns.reduce((sum, b) => sum + b.grandTotal, 0);
  return receiptTotal === breakdownTotal;
}

export function generateShareableText(split: Split, breakdowns: ParticipantBreakdown[]): string {
  const formatC = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  let text = `💰 ${split.name || 'Split Summary'}\n\n`;
  breakdowns.forEach((breakdown) => {
    text += `${breakdown.participantName}:\n`;
    breakdown.items.forEach((item) => {
      text += `  ${item.itemName}: ${formatC(item.amount)}\n`;
    });
    if (breakdown.taxTotal > 0) text += `  Tax: ${formatC(breakdown.taxTotal)}\n`;
    if (breakdown.tipTotal > 0) text += `  Tip: ${formatC(breakdown.tipTotal)}\n`;
    text += `  Total: ${formatC(breakdown.grandTotal)}\n\n`;
  });
  text += `Receipt Total: ${formatC(getReceiptTotal(split))}`;
  return text;
}

export function getRunningTally(split: Split): Map<string, number> {
  const tally = new Map<string, number>();
  split.participants.forEach((p) => tally.set(p.id, 0));
  split.items.forEach((item) => {
    if (item.assignments.length === 0) return;
    const totalCost = safeNumber(item.priceInCents) * safeNumber(item.quantity);
    const totalShares = item.assignments.reduce((sum, a) => sum + safeNumber(a.shares), 0);
    if (totalShares === 0) return;
    item.assignments.forEach((assignment) => {
      const share = (totalCost * safeNumber(assignment.shares)) / totalShares;
      const current = tally.get(assignment.participantId) || 0;
      tally.set(assignment.participantId, Number.isFinite(current + share) ? current + share : current);
    });
  });
  return tally;
}

export function allItemsAssigned(split: Split): boolean {
  return split.items.every((item) => item.assignments.length > 0);
}

/**
 * Calculate per-person totals across multiple splits in an event.
 * Returns a map of participant name (lowercased) → { name, total }.
 * Matches participants across splits by name (case-insensitive).
 */
export function calculateEventBreakdown(
  splits: Split[]
): { name: string; total: number }[] {
  const totals = new Map<string, { name: string; total: number }>();

  for (const split of splits) {
    const breakdowns = calculateBreakdown(split);
    for (const b of breakdowns) {
      const key = b.participantName.toLowerCase();
      const existing = totals.get(key);
      if (existing) {
        existing.total += b.grandTotal;
      } else {
        totals.set(key, { name: b.participantName, total: b.grandTotal });
      }
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

/**
 * Calculate what each person owes based on what they actually got assigned.
 * Returns a list with each person's name and their total across all receipts.
 * This is "you pay what you ordered", not an equal split.
 */
export function calculateEventSettlement(
  splits: Split[]
): { name: string; owes: number }[] {
  return calculateEventBreakdown(splits)
    .filter((b) => b.total > 0)
    .map((b) => ({ name: b.name, owes: b.total }));
}

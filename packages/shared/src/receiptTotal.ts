import type { Split } from './types';

/**
 * Get total receipt amount in cents (items + tax + tip). Pure; no DOM.
 */
export function getReceiptTotal(split: Split): number {
  const itemsTotal = split.items.reduce((sum, item) => {
    const cents = Number(item.priceInCents) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + cents * qty;
  }, 0);
  const tax = Number(split.taxInCents) || 0;
  const tip = Number(split.tipInCents) || 0;
  const total = itemsTotal + tax + tip;
  return Number.isFinite(total) ? total : 0;
}

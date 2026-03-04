/**
 * Pure formatting and ID helpers. No DOM/browser.
 */

export function formatCurrency(cents: number): string {
  if (!Number.isFinite(cents)) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
}

export function isValidMoneyInput(str: string): boolean {
  if (str === '') return true;
  return /^\d*\.?\d{0,2}$/.test(str);
}

export function moneyStringToCents(str: string): number {
  if (str === '' || str === '.') return 0;
  const cleaned = str.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length === 1) {
    const whole = parseInt(parts[0], 10);
    if (isNaN(whole) || whole < 0) return 0;
    return whole * 100;
  }
  if (parts.length === 2) {
    const whole = parseInt(parts[0] || '0', 10);
    const decimal = parts[1].substring(0, 2).padEnd(2, '0');
    if (isNaN(whole) || whole < 0) return 0;
    return whole * 100 + parseInt(decimal, 10);
  }
  return 0;
}

export function centsToMoneyString(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return '';
  return (cents / 100).toFixed(2);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  // Fallback: produce a valid UUID v4 (8-4-4-4-12 hex) for PostgreSQL uuid type
  const hex = (n: number, width: number) =>
    Math.floor(n).toString(16).padStart(width, '0').slice(-width);
  const r = () => Math.floor(Math.random() * 0x10000);
  const variant = ['8', '9', 'a', 'b'][r() % 4];
  return [
    hex(r(), 4) + hex(r(), 4),
    hex(r(), 4),
    '4' + hex(r(), 3),
    variant + hex(r(), 3),
    hex(r(), 4) + hex(r(), 4) + hex(r(), 4),
  ].join('-');
}

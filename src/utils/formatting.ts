export const formatCurrency = (cents: number): string => {
  // Handle NaN, Infinity, or invalid values
  if (!Number.isFinite(cents)) {
    return '$0.00';
  }
  return `$${(cents / 100).toFixed(2)}`;
};

export const parseCurrency = (value: string): number | null => {
  // Remove all non-numeric characters except decimal point
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed) || parsed < 0) return null;
  
  return Math.round(parsed * 100);
};

/**
 * Validates if a string is a valid money input while typing
 * Allows: digits, single decimal point, up to 2 decimal places, empty string
 */
export const isValidMoneyInput = (str: string): boolean => {
  if (str === '') return true;
  
  // Allow digits and a single decimal point
  const pattern = /^\d*\.?\d{0,2}$/;
  return pattern.test(str);
};

/**
 * Converts a money string to cents (integer)
 * Handles normalization: "4" => 400, "4." => 400, "4.9" => 490, "4.99" => 499
 * Trims to 2 decimal places: "4.999" => 499 (not 500)
 * Returns 0 for empty string or invalid input
 */
export const moneyStringToCents = (str: string): number => {
  if (str === '' || str === '.') return 0;
  
  // Remove any non-digit/non-decimal characters (shouldn't happen if validated, but safety check)
  const cleaned = str.replace(/[^0-9.]/g, '');
  
  // Split by decimal point to handle truncation to 2 decimal places
  const parts = cleaned.split('.');
  
  if (parts.length === 1) {
    // No decimal point: "4" => 400
    const whole = parseInt(parts[0], 10);
    if (isNaN(whole) || whole < 0) return 0;
    return whole * 100;
  } else if (parts.length === 2) {
    // Has decimal point: "4.9" or "4.99" or "4.999"
    const whole = parseInt(parts[0] || '0', 10);
    const decimal = parts[1].substring(0, 2).padEnd(2, '0'); // Truncate to 2 digits, pad if needed
    
    if (isNaN(whole) || whole < 0) return 0;
    
    const wholeCents = whole * 100;
    const decimalCents = parseInt(decimal, 10);
    
    return wholeCents + decimalCents;
  }
  
  return 0;
};

/**
 * Converts cents (integer) to a money string for display
 * 0 => "", 400 => "4.00", 499 => "4.99", 1234 => "12.34"
 */
export const centsToMoneyString = (cents: number): string => {
  if (!Number.isFinite(cents) || cents <= 0) return '';
  
  const dollars = cents / 100;
  return dollars.toFixed(2);
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

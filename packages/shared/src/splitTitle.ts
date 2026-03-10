const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Shorten a name to at most `maxWords` words.
 * e.g. "Costco Wholesale Membership" → "Costco Wholesale"
 */
function truncateWords(str: string, maxWords: number): string {
  const words = str.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ');
}

export function generateAutoTitle(opts: {
  merchantName?: string;
  category?: string;
  createdAt: number;
}): string {
  const d = new Date(opts.createdAt);
  const dateStr = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  if (opts.merchantName) return `${truncateWords(opts.merchantName, 2)} · ${dateStr}`;
  if (opts.category) return `${opts.category} · ${dateStr}`;
  return `Split · ${dateStr}`;
}

/**
 * Generate a short event title from captured receipt merchant names.
 * Keeps result to 2-3 words max.
 */
export function generateEventTitle(merchantNames: (string | undefined)[]): string {
  const names = merchantNames.filter((n): n is string => !!n && n.trim().length > 0);
  if (names.length === 0) {
    const d = new Date();
    return `Split · ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  }
  if (names.length === 1) {
    return truncateWords(names[0], 2);
  }
  // Multiple merchants: use first merchant + "& more" or combine if both short
  const first = truncateWords(names[0], 1);
  const uniqueNames = [...new Set(names.map((n) => truncateWords(n, 1)))];
  if (uniqueNames.length === 1) {
    // All same merchant
    return `${truncateWords(names[0], 2)} x${names.length}`;
  }
  if (uniqueNames.length === 2) {
    return `${uniqueNames[0]} & ${uniqueNames[1]}`;
  }
  return `${first} & ${uniqueNames.length - 1} more`;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function generateAutoTitle(opts: {
  merchantName?: string;
  category?: string;
  createdAt: number;
}): string {
  const d = new Date(opts.createdAt);
  const dateStr = `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
  if (opts.merchantName) return `${opts.merchantName} \u00b7 ${dateStr}`;
  if (opts.category) return `${opts.category} \u00b7 ${dateStr}`;
  return `Receipt \u00b7 ${dateStr}`;
}

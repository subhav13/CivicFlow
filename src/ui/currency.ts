export function parseDollarsToCents(value: string): number | null {
  const normalized = value.trim().replace(/[$,\s]/gu, '');
  if (!/^\d+(?:\.\d{1,2})?$/u.test(normalized)) return null;
  const [dollars, cents = ''] = normalized.split('.');
  const amount = Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount < 0) return null;
  return amount;
}

export function formatCentsAsDollars(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

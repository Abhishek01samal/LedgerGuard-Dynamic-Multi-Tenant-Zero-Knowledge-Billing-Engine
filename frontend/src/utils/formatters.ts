export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function truncateHash(hash?: string, chars: number = 6): string {
  if (!hash) return '—';
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

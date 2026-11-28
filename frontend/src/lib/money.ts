export function fromMinor(amountMinor: number): number {
  return amountMinor / 100;
}

export function formatMoney(amountMajor: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amountMajor);
  } catch {
    return `${currency} ${amountMajor.toFixed(2)}`;
  }
}

export function formatMinor(amountMinor: number, currency = 'INR'): string {
  return formatMoney(fromMinor(amountMinor), currency);
}

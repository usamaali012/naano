const eurFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatCents(cents: number): string {
  return eurFormatter.format(cents / 100);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(value);
}

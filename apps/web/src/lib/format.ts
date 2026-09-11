import { cpmCents } from "@naano/shared";
import type { Vertical } from "@naano/shared";

const eurFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("en-US", { notation: "compact" });

/** Whole euros from integer cents: 18800 -> "€188". */
export function formatCents(cents: number): string {
  return eurFormatter.format(cents / 100);
}

/** Compact count: 17300 -> "17.3K". */
export function formatCompactNumber(value: number): string {
  return compactFormatter.format(value);
}

/**
 * CPM for the card and the booking rail, in whole euros. Derives from the one
 * shared formula so this never disagrees with anything else. Returns "—" when
 * median views are unknown.
 */
export function formatCpm(postCostCents: number, medianViews: number): string {
  const cents = cpmCents(postCostCents, medianViews);
  return cents === 0 ? "—" : formatCents(cents);
}

/** Engagement rate stored as a fraction: 0.041 -> "4.1%". */
export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

// The stored enum -> the sentence-case label the UI shows. Sentence case, per
// docs/DESIGN.md; keeps SaaS capitalised where it reads as a word.
const VERTICAL_LABELS: Record<Vertical, string> = {
  SALES: "Sales",
  REVOPS: "RevOps",
  DEVTOOLS: "Dev tools",
  HR_TECH: "HR tech",
  PRODUCT: "Product",
  MARKETING_OPS: "Marketing ops",
  FINTECH: "Fintech",
  VERTICAL_SAAS: "Vertical SaaS",
};

export function verticalLabel(vertical: Vertical): string {
  return VERTICAL_LABELS[vertical];
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** An ISO timestamp as relative time: "3 hours ago", "2 days ago". */
export function formatRelativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return relativeTimeFormatter.format(diffDays, "day");
}


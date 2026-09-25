import { COMMISSION_PCT } from "@naano/shared";

/**
 * What the creator receives after COMMISSION_PCT, rounded to whole cents.
 * The one place this is computed — everywhere a creator sees a net figure
 * (Collaborations, Earnings) calls this, so the two can't drift apart.
 */
export function netCents(agreedPriceCents: number): number {
  return agreedPriceCents - Math.round((agreedPriceCents * COMMISSION_PCT) / 100);
}

// CPM is derived, never stored (docs/RECON.md §10). One implementation, shared
// by the API and the web app so the number on the card and the number in the
// booking rail can never disagree.
//
// The live product states the formula literally when you expand "How pricing is
// calculated": `188 € ÷ 17.3K × 1,000`. In cents that is
// postCostCents / medianViews * 1000, i.e. the cost of reaching 1,000 viewers.

/** Cost per mille in integer cents. Returns 0 when views are unknown. */
export function cpmCents(postCostCents: number, medianViews: number): number {
  if (!medianViews || medianViews <= 0) return 0;
  return Math.round((postCostCents / medianViews) * 1000);
}

/** Cost per mille in whole EUR, for display and for band checks. */
export function cpmEur(postCostCents: number, medianViews: number): number {
  return cpmCents(postCostCents, medianViews) / 100;
}

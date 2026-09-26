import { create } from "zustand";
import type { CreatorSort, Vertical } from "@naano/shared";

// Page state for the creators grid. Kept small so pagination is exercised
// against the seed set of 40. Changing the sort, the search text, the tab or
// any filter resets to page 1 — the old page number rarely makes sense
// against a new list.
export const CREATORS_PAGE_SIZE = 12;

export type CreatorsTab = "all" | "shortlist";

interface CreatorsListState {
  page: number;
  pageSize: number;
  sort: CreatorSort;
  q: string;
  tab: CreatorsTab;
  vertical: Vertical[];
  country: string | undefined;
  minFollowers: number | undefined;
  maxFollowers: number | undefined;
  priceMinCents: number | undefined;
  priceMaxCents: number | undefined;
  maxCpmEur: number | undefined;
  minMedianViews: number | undefined;
  minEngagementPct: number | undefined;
  postedWithinDays: number | undefined;
  setPage: (page: number) => void;
  setSort: (sort: CreatorSort) => void;
  setQuery: (q: string) => void;
  setTab: (tab: CreatorsTab) => void;
  setVerticals: (vertical: Vertical[]) => void;
  setCountry: (country: string | undefined) => void;
  setFollowerRange: (min: number | undefined, max: number | undefined) => void;
  setPriceRange: (minCents: number | undefined, maxCents: number | undefined) => void;
  setMaxCpmEur: (value: number | undefined) => void;
  setMinMedianViews: (value: number | undefined) => void;
  setMinEngagementPct: (value: number | undefined) => void;
  setPostedWithinDays: (value: number | undefined) => void;
  clearPerformanceFilters: () => void;
}

export const useCreatorsStore = create<CreatorsListState>((set) => ({
  page: 1,
  pageSize: CREATORS_PAGE_SIZE,
  sort: "best_match",
  q: "",
  tab: "all",
  vertical: [],
  country: undefined,
  minFollowers: undefined,
  maxFollowers: undefined,
  priceMinCents: undefined,
  priceMaxCents: undefined,
  maxCpmEur: undefined,
  minMedianViews: undefined,
  minEngagementPct: undefined,
  postedWithinDays: undefined,
  setPage: (page) => set({ page: page < 1 ? 1 : page }),
  setSort: (sort) => set({ sort, page: 1 }),
  setQuery: (q) => set({ q, page: 1 }),
  setTab: (tab) => set({ tab, page: 1 }),
  setVerticals: (vertical) => set({ vertical, page: 1 }),
  setCountry: (country) => set({ country, page: 1 }),
  setFollowerRange: (minFollowers, maxFollowers) =>
    set({ minFollowers, maxFollowers, page: 1 }),
  setPriceRange: (priceMinCents, priceMaxCents) =>
    set({ priceMinCents, priceMaxCents, page: 1 }),
  setMaxCpmEur: (maxCpmEur) => set({ maxCpmEur, page: 1 }),
  setMinMedianViews: (minMedianViews) => set({ minMedianViews, page: 1 }),
  setMinEngagementPct: (minEngagementPct) => set({ minEngagementPct, page: 1 }),
  setPostedWithinDays: (postedWithinDays) => set({ postedWithinDays, page: 1 }),
  clearPerformanceFilters: () =>
    set({
      priceMinCents: undefined,
      priceMaxCents: undefined,
      maxCpmEur: undefined,
      minMedianViews: undefined,
      minEngagementPct: undefined,
      postedWithinDays: undefined,
      page: 1,
    }),
}));

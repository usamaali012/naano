import { create } from "zustand";
import type { CreatorSort } from "@naano/shared";

// Page state for the creators grid. Kept small so pagination is exercised
// against the seed set of 40. Changing the sort, the search text or the tab
// resets to page 1 — the old page number rarely makes sense against a new list.
export const CREATORS_PAGE_SIZE = 12;

export type CreatorsTab = "all" | "shortlist";

interface CreatorsListState {
  page: number;
  pageSize: number;
  sort: CreatorSort;
  q: string;
  tab: CreatorsTab;
  setPage: (page: number) => void;
  setSort: (sort: CreatorSort) => void;
  setQuery: (q: string) => void;
  setTab: (tab: CreatorsTab) => void;
}

export const useCreatorsStore = create<CreatorsListState>((set) => ({
  page: 1,
  pageSize: CREATORS_PAGE_SIZE,
  sort: "best_match",
  q: "",
  tab: "all",
  setPage: (page) => set({ page: page < 1 ? 1 : page }),
  setSort: (sort) => set({ sort, page: 1 }),
  setQuery: (q) => set({ q, page: 1 }),
  setTab: (tab) => set({ tab, page: 1 }),
}));

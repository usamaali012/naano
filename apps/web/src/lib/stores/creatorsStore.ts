import { create } from "zustand";

// Page size for the creators grid. Kept small so pagination is exercised
// against the seed set of 40.
export const CREATORS_PAGE_SIZE = 12;

interface CreatorsListState {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
}

export const useCreatorsStore = create<CreatorsListState>((set) => ({
  page: 1,
  pageSize: CREATORS_PAGE_SIZE,
  setPage: (page) => set({ page: page < 1 ? 1 : page }),
}));

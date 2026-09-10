import { create } from "zustand";
import { persist } from "zustand/middleware";

// The brand's saved creators. Persisted to localStorage so the shortlist and
// its tab count survive a reload. Slice 2.8 builds the dedicated Shortlist tab
// view on top of this; the marketplace star and the bulk "Add to shortlist"
// action write here.
interface ShortlistState {
  ids: string[];
  toggle: (id: string) => void;
  add: (ids: string[]) => void;
  has: (id: string) => boolean;
  clear: () => void;
}

export const useShortlistStore = create<ShortlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((x) => x !== id)
            : [...state.ids, id],
        })),
      add: (ids) =>
        set((state) => ({
          ids: [...state.ids, ...ids.filter((id) => !state.ids.includes(id))],
        })),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    { name: "naano.shortlist" },
  ),
);

import { create } from "zustand";
import { api } from "../api";

// The brand's shortlist, keyed to the active campaign and stored in the API so
// the marketplace Shortlist tab and the campaign Shortlist tab (3.5) read the
// same rows. Writes are optimistic and revert on failure.
interface ShortlistState {
  campaignId: string | null;
  ids: string[];
  status: "idle" | "loading" | "ready" | "error";
  hydrate: () => Promise<void>;
  toggle: (creatorId: string) => Promise<void>;
  add: (creatorIds: string[]) => Promise<void>;
  has: (creatorId: string) => boolean;
}

export const useShortlistStore = create<ShortlistState>((set, get) => ({
  campaignId: null,
  ids: [],
  status: "idle",

  hydrate: async () => {
    if (get().status === "loading") return;
    set({ status: "loading" });
    try {
      const campaign = await api.getActiveCampaign();
      const page = await api.listShortlist(campaign.id, { pageSize: 100 });
      set({
        campaignId: campaign.id,
        ids: page.items.map((creator) => creator.id),
        status: "ready",
      });
    } catch {
      // No campaign yet, or the API is down — the tab shows its empty state.
      set({ campaignId: null, ids: [], status: "error" });
    }
  },

  toggle: async (creatorId) => {
    const { campaignId, ids } = get();
    if (!campaignId) return;
    const wasOn = ids.includes(creatorId);
    const next = wasOn
      ? ids.filter((id) => id !== creatorId)
      : [...ids, creatorId];
    set({ ids: next });
    try {
      if (wasOn) await api.removeFromShortlist(campaignId, creatorId);
      else await api.addToShortlist(campaignId, creatorId);
    } catch {
      set({ ids }); // revert
    }
  },

  add: async (creatorIds) => {
    const { campaignId, ids } = get();
    if (!campaignId) return;
    const toAdd = creatorIds.filter((id) => !ids.includes(id));
    if (toAdd.length === 0) return;
    set({ ids: [...ids, ...toAdd] });
    try {
      await Promise.all(
        toAdd.map((id) => api.addToShortlist(campaignId, id)),
      );
    } catch {
      set({ ids }); // revert the whole batch
    }
  },

  has: (creatorId) => get().ids.includes(creatorId),
}));

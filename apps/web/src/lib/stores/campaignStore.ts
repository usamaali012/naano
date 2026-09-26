import { create } from "zustand";
import type { CampaignOverview } from "@naano/shared";
import { api } from "../api";
import { useAuthStore } from "./authStore";

function storageKey(companyId: string): string {
  return `naano.campaign.${companyId}`;
}

function readStoredCampaignId(companyId: string): string | null {
  try {
    return localStorage.getItem(storageKey(companyId));
  } catch {
    return null;
  }
}

function writeStoredCampaignId(companyId: string, campaignId: string): void {
  try {
    localStorage.setItem(storageKey(companyId), campaignId);
  } catch {
    // Best effort — a private window or blocked storage just means the
    // choice isn't remembered next visit.
  }
}

// Which campaign the marketplace is ranked for, the shortlist/bookings stores
// are keyed to, and the budget bar reads. Default is GET /campaigns/active,
// same as before this switcher existed; a signed-in company's own choice is
// then remembered in localStorage so switching back to the marketplace later
// keeps it. hydrate() is safe to call again after any mutation that could
// move the money (e.g. a new booking) — it keeps the current selection if it
// is still in the list, so a refetch never yanks the switcher back to the
// default.
interface CampaignState {
  campaigns: CampaignOverview[];
  selectedCampaignId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  hydrate: () => Promise<void>;
  select: (campaignId: string) => void;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  selectedCampaignId: null,
  status: "idle",

  hydrate: async () => {
    set({ status: "loading" });
    try {
      const list = await api.listCampaigns({ pageSize: 100 });
      const { selectedCampaignId } = get();
      let nextId =
        selectedCampaignId && list.items.some((c) => c.id === selectedCampaignId)
          ? selectedCampaignId
          : null;

      if (!nextId) {
        const companyId = useAuthStore.getState().me?.companyId ?? null;
        const remembered = companyId ? readStoredCampaignId(companyId) : null;
        if (remembered && list.items.some((c) => c.id === remembered)) {
          nextId = remembered;
        } else {
          try {
            const active = await api.getActiveCampaign();
            nextId = list.items.some((c) => c.id === active.id)
              ? active.id
              : list.items[0]?.id ?? null;
          } catch {
            nextId = list.items[0]?.id ?? null;
          }
        }
      }

      set({ campaigns: list.items, selectedCampaignId: nextId, status: "ready" });
    } catch {
      set({ campaigns: [], selectedCampaignId: null, status: "error" });
    }
  },

  select: (campaignId) => {
    set({ selectedCampaignId: campaignId });
    const companyId = useAuthStore.getState().me?.companyId ?? null;
    if (companyId) writeStoredCampaignId(companyId, campaignId);
  },
}));

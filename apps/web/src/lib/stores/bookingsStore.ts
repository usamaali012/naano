import { create } from "zustand";
import type { BookingStatus } from "@naano/shared";
import { api } from "../api";

// The brand's bookings for the active campaign, keyed by creator, so the
// marketplace card can show "already booked" without a dedicated screen.
// Read-only from the marketplace's point of view -- creating a booking
// updates the map directly via recordBooking rather than a re-fetch.
interface BookingsState {
  campaignId: string | null;
  byCreatorId: Record<string, BookingStatus>;
  status: "idle" | "loading" | "ready" | "error";
  hydrate: () => Promise<void>;
  recordBooking: (creatorProfileId: string, status: BookingStatus) => void;
}

export const useBookingsStore = create<BookingsState>((set, get) => ({
  campaignId: null,
  byCreatorId: {},
  status: "idle",

  hydrate: async () => {
    if (get().status === "loading") return;
    set({ status: "loading" });
    try {
      const campaign = await api.getActiveCampaign();
      const page = await api.listBookingsSent({ campaignId: campaign.id, pageSize: 100 });
      const byCreatorId: Record<string, BookingStatus> = {};
      for (const booking of page.items) {
        byCreatorId[booking.creatorProfileId] = booking.status;
      }
      set({ campaignId: campaign.id, byCreatorId, status: "ready" });
    } catch {
      set({ campaignId: null, byCreatorId: {}, status: "error" });
    }
  },

  recordBooking: (creatorProfileId, status) => {
    set((state) => ({
      byCreatorId: { ...state.byCreatorId, [creatorProfileId]: status },
    }));
  },
}));

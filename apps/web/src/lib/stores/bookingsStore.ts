import { create } from "zustand";
import type { Booking, BookingStatus } from "@naano/shared";
import { api } from "../api";

export interface CreatorBookingInfo {
  status: BookingStatus;
  /** Clicks on the booking's tracked link, or null before one exists. */
  clickCount: number | null;
}

// The brand's bookings for the active campaign, keyed by creator, so the
// marketplace card can show "already booked" (and, once accepted, its click
// count) without a dedicated screen. Read-only from the marketplace's point
// of view -- creating a booking updates the map directly via recordBooking
// rather than a re-fetch.
interface BookingsState {
  campaignId: string | null;
  byCreatorId: Record<string, CreatorBookingInfo>;
  status: "idle" | "loading" | "ready" | "error";
  hydrate: () => Promise<void>;
  recordBooking: (creatorProfileId: string, booking: Booking) => void;
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
      const byCreatorId: Record<string, CreatorBookingInfo> = {};
      for (const booking of page.items) {
        byCreatorId[booking.creatorProfileId] = {
          status: booking.status,
          clickCount: booking.clickCount,
        };
      }
      set({ campaignId: campaign.id, byCreatorId, status: "ready" });
    } catch {
      set({ campaignId: null, byCreatorId: {}, status: "error" });
    }
  },

  recordBooking: (creatorProfileId, booking) => {
    set((state) => ({
      byCreatorId: {
        ...state.byCreatorId,
        [creatorProfileId]: { status: booking.status, clickCount: booking.clickCount },
      },
    }));
  },
}));

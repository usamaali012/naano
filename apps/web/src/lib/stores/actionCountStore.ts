import { create } from "zustand";
import { api } from "../api";

// How many bookings are waiting on the signed-in user, for the Collaborations
// rail badge. No polling — refresh() is called once on shell mount and again
// after every lifecycle action / accept-decline succeeds, from wherever each
// page already handles that success.
interface ActionCountState {
  count: number;
  refresh: () => Promise<void>;
}

export const useActionCountStore = create<ActionCountState>((set) => ({
  count: 0,
  refresh: async () => {
    try {
      const { count } = await api.getActionCount();
      set({ count });
    } catch {
      // Leave the last known count rather than flashing the badge to zero on
      // a transient failure.
    }
  },
}));

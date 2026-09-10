import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthMe } from "@naano/shared";
import { api, setApiToken } from "../api";

// The signed-in session. `signIn` does a real POST /auth/login then GET
// /auth/me; the JWT is persisted to localStorage and re-attached to every
// authenticated request on reload. No faked sessions.
interface AuthState {
  token: string | null;
  me: AuthMe | null;
  status: "idle" | "signing-in" | "error";
  signIn: (email: string, password: string) => Promise<AuthMe>;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      me: null,
      status: "idle",

      signIn: async (email, password) => {
        set({ status: "signing-in" });
        try {
          const { accessToken } = await api.login(email, password);
          setApiToken(accessToken);
          const me = await api.getMe();
          set({ token: accessToken, me, status: "idle" });
          return me;
        } catch (error) {
          setApiToken(null);
          set({ token: null, me: null, status: "error" });
          throw error;
        }
      },

      signOut: () => {
        setApiToken(null);
        set({ token: null, me: null, status: "idle" });
      },
    }),
    {
      name: "naano.auth",
      partialize: (state) => ({ token: state.token, me: state.me }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setApiToken(state.token);
      },
    },
  ),
);

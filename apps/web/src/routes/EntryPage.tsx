import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../lib/stores/authStore";
import { Logo } from "../components/ui/Logo";
import { RolePanel } from "../components/entry/RolePanel";
import { BookingStepsStrip } from "../components/entry/BookingStepsStrip";
import { LiveCreatorsStrip } from "../components/entry/LiveCreatorsStrip";

// Seeded demo brand (apps/api/prisma/seed.ts): Ledgerly owns the live campaign
// the marketplace ranks against. Same seed password for both sides.
const DEMO_PASSWORD = "password123";
const BRAND_EMAIL = "growth@ledgerly.example.com";

type Side = "brand" | "creator";

export function EntryPage(): JSX.Element {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  const [pending, setPending] = useState<Side | null>(null);
  const [failed, setFailed] = useState(false);

  async function enter(side: Side): Promise<void> {
    setPending(side);
    setFailed(false);
    try {
      // "Continue as a creator" resolves which account to use via GET
      // /auth/demo-creator: whoever the demo brand most recently booked, so
      // booking someone as the brand and clicking through here lands on
      // exactly that person with a fresh INVITED row. See DECISIONS.md.
      const email =
        side === "brand" ? BRAND_EMAIL : (await api.getDemoCreatorEmail()).email;
      await signIn(email, DEMO_PASSWORD);
      navigate("/app");
    } catch {
      setFailed(true);
      setPending(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-s12 px-s8 py-s12 sm:px-s12">
      <div className="flex items-center gap-s2">
        <Logo className="h-8 w-8" />
        <span className="text-card-title text-text">naano</span>
      </div>

      <div className="flex max-w-2xl flex-col gap-s4">
        <h1 className="text-page-title text-text">
          Book LinkedIn creators. See every click.
        </h1>
        <p className="text-body text-text-muted">
          A B2B marketplace where brands book LinkedIn creators to post about
          their product, and every post carries a tracked link. This is a
          seeded demo with a real API and database. Pick a side.
        </p>
      </div>

      <div className="flex flex-col gap-s6">
        <div className="flex flex-col gap-s6 lg:flex-row lg:items-stretch">
          <RolePanel
            title="Brand"
            subtitle="Ledgerly"
            bullets={[
              "Compare creators by sector fit and verified reach",
              "Book against a campaign budget",
              "Review drafts, confirm payment, trace clicks",
            ]}
            ctaLabel="Continue as a brand"
            pendingLabel="Signing in…"
            pending={pending === "brand"}
            disabled={pending !== null}
            onSelect={() => void enter("brand")}
          />
          <RolePanel
            title="Creator"
            bullets={[
              "Accept or decline invitations",
              "Send drafts, publish with your tracked link",
              "See what you earn after commission",
            ]}
            ctaLabel="Continue as a creator"
            pendingLabel="Signing in…"
            pending={pending === "creator"}
            disabled={pending !== null}
            onSelect={() => void enter("creator")}
          />
        </div>

        {failed && (
          <p className="text-label text-warn">
            Could not sign in. The server may still be starting — try again.
          </p>
        )}
      </div>

      <BookingStepsStrip />
      <LiveCreatorsStrip />
    </div>
  );
}

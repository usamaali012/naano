import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../lib/stores/authStore";
import { Logo } from "../components/ui/Logo";

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
    <div className="grid min-h-screen bg-bg lg:grid-cols-[3fr_2fr]">
      <main className="flex flex-col justify-center gap-s8 px-s8 py-s12 sm:px-s12">
        <div className="flex items-center gap-s2">
          <Logo className="h-8 w-8" />
          <span className="text-card-title text-text">naano</span>
        </div>

        <div className="flex max-w-xl flex-col gap-s4">
          <h1 className="text-page-title text-text">
            Book LinkedIn creators, trace every click
          </h1>
          <p className="text-body text-text-muted">
            naano is a B2B marketplace where brands book LinkedIn creators to
            post about their product. Brands shortlist creators by sector fit and
            verified performance, then book a single post or a bundle of five.
            This is a seeded demo — pick a side to look around.
          </p>
        </div>

        <div className="flex max-w-xl flex-col gap-s3">
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void enter("brand")}
            className="flex flex-col items-start gap-s1 rounded-card border border-border bg-surface p-s4 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-card-title text-primary">
              {pending === "brand" ? "Signing in…" : "Continue as a brand"}
            </span>
            <span className="text-label text-text-muted">
              Ledgerly — browse the marketplace and book creators
            </span>
          </button>

          <button
            type="button"
            disabled={pending !== null}
            onClick={() => void enter("creator")}
            className="flex flex-col items-start gap-s1 rounded-card border border-border bg-surface p-s4 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-card-title text-primary">
              {pending === "creator" ? "Signing in…" : "Continue as a creator"}
            </span>
            <span className="text-label text-text-muted">
              See how your profile appears to brands
            </span>
          </button>

          {failed && (
            <p className="text-label text-warn">
              Could not sign in. The server may still be starting — try again.
            </p>
          )}
        </div>
      </main>

      <aside className="hidden flex-col justify-center gap-s4 bg-primary px-s12 py-s12 text-white lg:flex">
        <p className="text-section-title">One marketplace, two sides.</p>
        <p className="max-w-sm text-body text-white/80">
          Brands book creators; creators get paid — and every sponsored post
          carries a tracked link back to the one who earned it.
        </p>
      </aside>
    </div>
  );
}

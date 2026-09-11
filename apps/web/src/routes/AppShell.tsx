import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../lib/stores/authStore";
import { Logo } from "../components/ui/Logo";

// Fixed 72px left icon rail, icons only, active item on a --primary-soft
// background (docs/DESIGN.md §layout). Content is capped at 1440px with 32px
// padding. Brand-only: every item routes somewhere real. A creator has
// exactly one screen (their own profile, already reachable at /app) so they
// get no rail at all rather than a single permanently-active icon — see
// docs/DECISIONS.md for why that reads as decoration, not navigation.
const RAIL = [
  { key: "marketplace", label: "Marketplace", path: "/app" },
  { key: "collaborations", label: "Collaborations", path: "/app/collaborations" },
  { key: "results", label: "Results", path: "/app/results" },
];

function RailIcon({ shape }: { shape: string }): JSX.Element {
  const paths: Record<string, JSX.Element> = {
    marketplace: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15 4.5a3 3 0 0 1 0 5.8M20.5 19a5.5 5.5 0 0 0-4-5.3" />
      </>
    ),
    collaborations: (
      <>
        <rect x="3.5" y="5" width="17" height="14" rx="2" />
        <path d="M3.5 9.5h17M9.5 9.5V19" />
      </>
    ),
    results: (
      <>
        <path d="M4 19V5M4 19h16M8 19v-6M12.5 19V9M17 19v-9" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[shape]}
    </svg>
  );
}

export function AppShell(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const me = useAuthStore((state) => state.me);
  const signOut = useAuthStore((state) => state.signOut);
  const isBrand = me?.role === "COMPANY";

  function handleSignOut(): void {
    signOut();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {isBrand && (
        <nav className="fixed inset-y-0 left-0 flex w-[72px] flex-col items-center gap-s2 border-r border-border bg-surface py-s4">
          <Logo className="mb-s4 h-8 w-8" />
          {RAIL.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.key}
                type="button"
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(item.path)}
                className={`group relative flex h-10 w-10 items-center justify-center rounded-control transition-colors ${
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <RailIcon shape={item.key} />
                <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-control bg-text px-s2 py-s1 text-label text-white opacity-0 shadow-overlay transition-opacity duration-100 group-hover:opacity-100">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      <main className={`flex-1 ${isBrand ? "ml-[72px]" : ""}`}>
        {me && (
          <header className="flex items-center justify-end gap-s3 border-b border-border bg-surface px-s8 py-s3">
            <span className="text-label text-text-muted">
              {me.displayName ?? me.email}
              <span className="ml-s2">
                {me.role === "COMPANY" ? "Brand" : "Creator"}
              </span>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-control border border-border px-s3 py-s1 text-label font-medium text-text transition-colors hover:border-primary"
            >
              Sign out
            </button>
          </header>
        )}
        <div className="mx-auto max-w-[1440px] p-s8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

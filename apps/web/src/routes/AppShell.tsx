import { Outlet } from "react-router-dom";

// Fixed 72px left icon rail, icons only, active item on a --primary-soft
// background (docs/DESIGN.md §layout). Content is capped at 1440px with 32px
// padding. The rail items past "Creators" are not wired to routes yet — this
// slice is the marketplace — so only the active one renders as a link target.
const RAIL = [
  { key: "creators", label: "Creators", active: true },
  { key: "campaigns", label: "Campaigns", active: false },
  { key: "collaborations", label: "Collaborations", active: false },
  { key: "results", label: "Results", active: false },
];

function RailIcon({ shape }: { shape: string }): JSX.Element {
  const paths: Record<string, JSX.Element> = {
    creators: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15 4.5a3 3 0 0 1 0 5.8M20.5 19a5.5 5.5 0 0 0-4-5.3" />
      </>
    ),
    campaigns: (
      <>
        <path d="M4 9h10l6-4v14l-6-4H4z" />
        <path d="M6 13v5" />
      </>
    ),
    collaborations: (
      <>
        <path d="M4 20v-1a4 4 0 0 1 4-4h3a4 4 0 0 1 4 4v1" />
        <circle cx="9.5" cy="8" r="3" />
        <path d="M16 15a4 4 0 0 1 4 4v1M15.5 5.5a3 3 0 0 1 0 5" />
      </>
    ),
    results: (
      <>
        <path d="M4 19V5M4 19h16M8 16v-4M13 16V8M18 16v-6" />
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
  return (
    <div className="flex min-h-screen bg-bg">
      <nav className="fixed inset-y-0 left-0 flex w-[72px] flex-col items-center gap-s2 border-r border-border bg-surface py-s4">
        <span className="mb-s4 flex h-8 w-8 items-center justify-center rounded-control bg-primary text-card-title text-white">
          n
        </span>
        {RAIL.map((item) => (
          <button
            key={item.key}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-control transition-colors ${
              item.active
                ? "bg-primary-soft text-primary"
                : "text-text-muted hover:text-text"
            }`}
          >
            <RailIcon shape={item.key} />
          </button>
        ))}
      </nav>

      <main className="ml-[72px] flex-1">
        <div className="mx-auto max-w-[1440px] p-s8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

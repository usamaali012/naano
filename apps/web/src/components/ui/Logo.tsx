// The naano mark: one SVG, token colours, no image asset to 404 in production.
// index.html carries the same geometry inline as the favicon — change both
// together or they drift.
export function Logo({
  className = "h-8 w-8",
}: {
  className?: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="naano"
    >
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M10.5 22.5v-11M10.5 16.2c0-2.6 1.9-4.4 4.5-4.4s4.4 1.8 4.4 4.4v6.3"
        fill="none"
        stroke="var(--surface)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.2" cy="11.6" r="2.1" fill="var(--surface)" />
    </svg>
  );
}

import { useState } from "react";
import type { ReactNode } from "react";

// A native <details> with the default marker replaced by a chevron that rotates
// on open. Motion is the accordion response the design rules allow. Token-only.
// `open` is tracked in state so a parent re-render (e.g. changing a price
// radio) never snaps it shut and the body always reflects current props.
interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className = "",
}: DisclosureProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={`group [&_summary::-webkit-details-marker]:hidden ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-s3 text-card-title text-text">
        {summary}
        <svg
          viewBox="0 0 12 12"
          className="h-3 w-3 shrink-0 text-text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="mt-s3">{children}</div>
    </details>
  );
}

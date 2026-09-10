import type { HTMLAttributes } from "react";

// Neutral informational pill: soft accent background, accent text, pill radius
// (the control value). Not for status — use StatusPill for anything that
// carries a state colour. See docs/DESIGN.md.
export function Badge({ className = "", ...props }: HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <span
      className={`inline-flex items-center rounded-control bg-primary-soft px-s2 py-s1 text-label text-primary ${className}`}
      {...props}
    />
  );
}

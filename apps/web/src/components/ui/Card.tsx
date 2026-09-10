import type { HTMLAttributes } from "react";

// Card radius, hairline border, no shadow. Hover (when interactive) changes the
// border colour only — never a lift or scale. See docs/DESIGN.md.
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className = "", interactive = false, ...props }: CardProps): JSX.Element {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-s4 ${
        interactive ? "transition-colors hover:border-primary" : ""
      } ${className}`}
      {...props}
    />
  );
}

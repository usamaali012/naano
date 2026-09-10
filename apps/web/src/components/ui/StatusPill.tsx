import type { CSSProperties } from "react";

// The only place a status colour is allowed to appear. Three tones:
//   success — active / live
//   warn    — blocked, needs the user
//   neutral — draft, suggested, everything else
// Background is a low tint mixed from the same token, so no new colour enters
// the system. See docs/DESIGN.md.
type StatusTone = "success" | "warn" | "neutral";

interface StatusPillProps {
  tone: StatusTone;
  label: string;
  className?: string;
}

const TOKEN: Record<StatusTone, string> = {
  success: "var(--success)",
  warn: "var(--warn)",
  neutral: "var(--text-muted)",
};

export function StatusPill({ tone, label, className = "" }: StatusPillProps): JSX.Element {
  const color = TOKEN[tone];
  const style: CSSProperties = {
    color,
    backgroundColor: `color-mix(in srgb, ${color} 12%, white)`,
  };
  return (
    <span
      className={`inline-flex items-center gap-s2 rounded-control px-s2 py-s1 text-label font-medium ${className}`}
      style={style}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}

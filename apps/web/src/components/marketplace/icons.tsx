import type { Network } from "@naano/shared";

// Small functional glyphs for the marketplace: the network a creator posts on,
// and the shortlist star. These carry meaning (which platform, saved or not),
// so they are not the "decorative icon next to every label" the design rules
// warn against. Drawn in currentColor so the caller controls the tone.

interface IconProps {
  className?: string;
}

export function NetworkBadge({ network }: { network: Network }): JSX.Element {
  const label = network === "LINKEDIN" ? "LinkedIn" : "X";
  return (
    <span
      title={`Posts on ${label}`}
      aria-label={`Posts on ${label}`}
      className="inline-flex h-6 w-6 items-center justify-center rounded-control border border-border text-[11px] font-semibold text-text-muted"
    >
      {network === "LINKEDIN" ? "in" : "X"}
    </span>
  );
}

export function StarIcon({ className = "", filled }: IconProps & { filled: boolean }): JSX.Element {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <path
        d="M10 1.6l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.9l-5.2 2.72.99-5.8L1.58 7.72l5.82-.85z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

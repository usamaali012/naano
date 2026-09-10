// A single audience dimension as one stacked bar plus a labelled legend, each
// entry showing its percentage. Slices are graduated tints mixed from the accent
// token — no palette of decorative colours. Widths are drawn from the given
// percentages directly; the caller guarantees they sum to 100.
interface Segment {
  label: string;
  percentage: number;
}

interface SegmentedBarProps {
  segments: Segment[];
  className?: string;
}

// Darkest → lightest, four steps. color-mix keeps these anchored to --primary.
const TINTS = [
  "var(--primary)",
  "color-mix(in srgb, var(--primary) 72%, white)",
  "color-mix(in srgb, var(--primary) 48%, white)",
  "color-mix(in srgb, var(--primary) 26%, white)",
];

function tintAt(index: number): string {
  return TINTS[index % TINTS.length] ?? TINTS[TINTS.length - 1]!;
}

export function SegmentedBar({ segments, className = "" }: SegmentedBarProps): JSX.Element {
  return (
    <div className={`flex flex-col gap-s3 ${className}`}>
      <div className="flex h-2 overflow-hidden rounded-full">
        {segments.map((seg, i) => (
          <div
            key={seg.label}
            style={{ width: `${seg.percentage}%`, backgroundColor: tintAt(i) }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-s2">
        {segments.map((seg, i) => (
          <li key={seg.label} className="flex items-center gap-s2 text-body">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: tintAt(i) }}
              aria-hidden="true"
            />
            <span className="flex-1 text-text">{seg.label}</span>
            <span className="tabular-nums text-text-muted">{seg.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

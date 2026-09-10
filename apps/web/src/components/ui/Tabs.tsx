// Controlled tab strip. Active tab: accent text over a 2px accent underline;
// the rest muted. The container carries the hairline the underline sits on.
// Optional count renders after the label ("All creators 928"). No icons.
interface TabItem {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ items, value, onChange, className = "" }: TabsProps): JSX.Element {
  return (
    <div role="tablist" className={`flex gap-s6 border-b border-border ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`-mb-px flex items-center gap-s2 border-b-2 pb-s3 pt-s1 text-body transition-colors ${
              active
                ? "border-primary font-medium text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="tabular-nums text-label text-text-muted">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

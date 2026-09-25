// Controlled tab strip, styled as a row of chips rather than an underline —
// the same "active = primary-soft fill" language the icon rail already uses
// (see docs/DESIGN.md §layout), so the two navigation idioms in the app read
// as one system instead of two defaults. Optional count renders after the
// label ("All creators 928"). No icons.
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
    <div role="tablist" className={`flex flex-wrap gap-s2 ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={`flex items-center gap-s2 rounded-control px-s4 py-s2 text-body transition-colors ${
              active
                ? "bg-primary-soft font-medium text-primary"
                : "text-text-muted hover:bg-bg hover:text-text"
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

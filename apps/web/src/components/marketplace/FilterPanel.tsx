import { useEffect, useRef, useState } from "react";
import type { Vertical } from "@naano/shared";
import { Checkbox } from "../ui/Checkbox";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { COUNTRY_OPTIONS, countryLabel } from "../../lib/countries";
import { formatCompactNumber, verticalLabel } from "../../lib/format";

const VERTICAL_OPTIONS: Array<{ value: Vertical; label: string }> = [
  "SALES",
  "REVOPS",
  "DEVTOOLS",
  "HR_TECH",
  "PRODUCT",
  "MARKETING_OPS",
  "FINTECH",
  "VERTICAL_SAAS",
].map((v) => ({ value: v as Vertical, label: verticalLabel(v as Vertical) }));

const COUNTRY_SELECT_OPTIONS = [
  { value: "", label: "All countries" },
  ...COUNTRY_OPTIONS,
];

interface FilterPanelProps {
  verticals: Vertical[];
  onVerticalsChange: (verticals: Vertical[]) => void;
  country: string | undefined;
  onCountryChange: (country: string | undefined) => void;
  minFollowers: number | undefined;
  maxFollowers: number | undefined;
  onFollowerRangeChange: (min: number | undefined, max: number | undefined) => void;
}

export function FilterPanel({
  verticals,
  onVerticalsChange,
  country,
  onCountryChange,
  minFollowers,
  maxFollowers,
  onFollowerRangeChange,
}: FilterPanelProps): JSX.Element {
  const hasActiveFilters =
    verticals.length > 0 ||
    country !== undefined ||
    minFollowers !== undefined ||
    maxFollowers !== undefined;

  function clearAll(): void {
    onVerticalsChange([]);
    onCountryChange(undefined);
    onFollowerRangeChange(undefined, undefined);
  }

  return (
    <div className="flex flex-col gap-s3 rounded-card border border-border bg-surface p-s4">
      <div className="flex flex-wrap items-end gap-s4">
        <IndustryFilter verticals={verticals} onChange={onVerticalsChange} />

        <label className="flex flex-col gap-s1">
          <span className="text-label text-text-muted">Country</span>
          <Select
            className="min-w-[10rem]"
            options={COUNTRY_SELECT_OPTIONS}
            value={country ?? ""}
            onChange={(event) => onCountryChange(event.target.value || undefined)}
          />
        </label>

        <FollowerRangeFilter
          min={minFollowers}
          max={maxFollowers}
          onChange={onFollowerRangeChange}
        />
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-s2 border-t border-border pt-s3">
          {verticals.map((v) => (
            <FilterChip
              key={v}
              label={verticalLabel(v)}
              onRemove={() => onVerticalsChange(verticals.filter((item) => item !== v))}
            />
          ))}
          {country !== undefined && (
            <FilterChip label={countryLabel(country)} onRemove={() => onCountryChange(undefined)} />
          )}
          {(minFollowers !== undefined || maxFollowers !== undefined) && (
            <FilterChip
              label={followerRangeLabel(minFollowers, maxFollowers)}
              onRemove={() => onFollowerRangeChange(undefined, undefined)}
            />
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-label font-medium text-primary"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function followerRangeLabel(min: number | undefined, max: number | undefined): string {
  if (min !== undefined && max !== undefined) {
    return `${formatCompactNumber(min)}–${formatCompactNumber(max)} followers`;
  }
  if (min !== undefined) return `${formatCompactNumber(min)}+ followers`;
  return `Up to ${formatCompactNumber(max ?? 0)} followers`;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }): JSX.Element {
  return (
    <Badge className="gap-s1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="text-primary"
      >
        ×
      </button>
    </Badge>
  );
}

function IndustryFilter({
  verticals,
  onChange,
}: {
  verticals: Vertical[];
  onChange: (verticals: Vertical[]) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const visibleOptions = VERTICAL_OPTIONS.filter((opt) =>
    opt.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function toggle(value: Vertical): void {
    if (verticals.includes(value)) {
      onChange(verticals.filter((v) => v !== value));
    } else {
      onChange([...verticals, value]);
    }
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-s1">
      <span className="text-label text-text-muted">Industry</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-[10rem] items-center justify-between gap-s2 rounded-control border border-border bg-surface px-s3 py-s2 text-body text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <span>
          {verticals.length === 0 ? "All industries" : `${verticals.length} selected`}
        </span>
        <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-text-muted">
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-s1 w-64 rounded-card border border-border bg-surface p-s3 shadow-overlay">
          <Input
            type="search"
            placeholder="Search industries"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mb-s3"
          />
          <div className="flex max-h-60 flex-col gap-s2 overflow-y-auto">
            {visibleOptions.length === 0 ? (
              <p className="text-body text-text-muted">No industries match.</p>
            ) : (
              visibleOptions.map((opt) => (
                <Checkbox
                  key={opt.value}
                  id={`industry-${opt.value}`}
                  label={opt.label}
                  checked={verticals.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FollowerRangeFilter({
  min,
  max,
  onChange,
}: {
  min: number | undefined;
  max: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
}): JSX.Element {
  const [minInput, setMinInput] = useState(min?.toString() ?? "");
  const [maxInput, setMaxInput] = useState(max?.toString() ?? "");

  // Keep local text in sync when the range is reset from outside (e.g. clear all).
  useEffect(() => {
    setMinInput(min?.toString() ?? "");
  }, [min]);
  useEffect(() => {
    setMaxInput(max?.toString() ?? "");
  }, [max]);

  // Debounce so typing a follower count doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      const nextMin = minInput.trim() === "" ? undefined : Number(minInput);
      const nextMax = maxInput.trim() === "" ? undefined : Number(maxInput);
      if (nextMin === min && nextMax === max) return;
      onChange(
        nextMin !== undefined && !Number.isNaN(nextMin) ? nextMin : undefined,
        nextMax !== undefined && !Number.isNaN(nextMax) ? nextMax : undefined,
      );
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minInput, maxInput]);

  return (
    <div className="flex flex-col gap-s1">
      <span className="text-label text-text-muted">Followers</span>
      <div className="flex items-center gap-s2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Min"
          value={minInput}
          onChange={(event) => setMinInput(event.target.value)}
          className="w-24"
        />
        <span className="text-body text-text-muted">–</span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Max"
          value={maxInput}
          onChange={(event) => setMaxInput(event.target.value)}
          className="w-24"
        />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type { Vertical } from "@naano/shared";
import { Checkbox } from "../ui/Checkbox";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { COUNTRY_OPTIONS, countryLabel } from "../../lib/countries";
import { formatCents, formatCompactNumber, verticalLabel } from "../../lib/format";

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

const POSTED_WITHIN_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

interface FilterPanelProps {
  verticals: Vertical[];
  onVerticalsChange: (verticals: Vertical[]) => void;
  country: string | undefined;
  onCountryChange: (country: string | undefined) => void;
  minFollowers: number | undefined;
  maxFollowers: number | undefined;
  onFollowerRangeChange: (min: number | undefined, max: number | undefined) => void;
  priceMinCents: number | undefined;
  priceMaxCents: number | undefined;
  onPriceRangeChange: (minCents: number | undefined, maxCents: number | undefined) => void;
  maxCpmEur: number | undefined;
  onMaxCpmChange: (value: number | undefined) => void;
  minMedianViews: number | undefined;
  onMinMedianViewsChange: (value: number | undefined) => void;
  minEngagementPct: number | undefined;
  onMinEngagementChange: (value: number | undefined) => void;
  postedWithinDays: number | undefined;
  onPostedWithinChange: (value: number | undefined) => void;
}

export function FilterPanel({
  verticals,
  onVerticalsChange,
  country,
  onCountryChange,
  minFollowers,
  maxFollowers,
  onFollowerRangeChange,
  priceMinCents,
  priceMaxCents,
  onPriceRangeChange,
  maxCpmEur,
  onMaxCpmChange,
  minMedianViews,
  onMinMedianViewsChange,
  minEngagementPct,
  onMinEngagementChange,
  postedWithinDays,
  onPostedWithinChange,
}: FilterPanelProps): JSX.Element {
  const hasActiveFilters =
    verticals.length > 0 ||
    country !== undefined ||
    minFollowers !== undefined ||
    maxFollowers !== undefined ||
    priceMinCents !== undefined ||
    priceMaxCents !== undefined ||
    maxCpmEur !== undefined ||
    minMedianViews !== undefined ||
    minEngagementPct !== undefined ||
    postedWithinDays !== undefined;

  function clearAll(): void {
    onVerticalsChange([]);
    onCountryChange(undefined);
    onFollowerRangeChange(undefined, undefined);
    onPriceRangeChange(undefined, undefined);
    onMaxCpmChange(undefined);
    onMinMedianViewsChange(undefined);
    onMinEngagementChange(undefined);
    onPostedWithinChange(undefined);
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

      <div className="flex flex-wrap items-end gap-s4 border-t border-border pt-s3">
        <PriceRangeFilter
          minCents={priceMinCents}
          maxCents={priceMaxCents}
          onChange={onPriceRangeChange}
        />

        <DebouncedNumberFilter
          label="Max CPM"
          placeholder="EUR"
          value={maxCpmEur}
          onChange={onMaxCpmChange}
        />

        <DebouncedNumberFilter
          label="Min median views"
          placeholder="Views"
          value={minMedianViews}
          onChange={onMinMedianViewsChange}
        />

        <DebouncedNumberFilter
          label="Min engagement"
          placeholder="%"
          value={minEngagementPct}
          onChange={onMinEngagementChange}
          max={100}
        />

        <label className="flex flex-col gap-s1">
          <span className="text-label text-text-muted">Posted within</span>
          <Select
            className="min-w-[9rem]"
            options={POSTED_WITHIN_OPTIONS}
            value={postedWithinDays?.toString() ?? ""}
            onChange={(event) =>
              onPostedWithinChange(event.target.value ? Number(event.target.value) : undefined)
            }
          />
        </label>
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
          {(priceMinCents !== undefined || priceMaxCents !== undefined) && (
            <FilterChip
              label={priceRangeLabel(priceMinCents, priceMaxCents)}
              onRemove={() => onPriceRangeChange(undefined, undefined)}
            />
          )}
          {maxCpmEur !== undefined && (
            <FilterChip
              label={`Max ${formatCents(maxCpmEur * 100)} CPM`}
              onRemove={() => onMaxCpmChange(undefined)}
            />
          )}
          {minMedianViews !== undefined && (
            <FilterChip
              label={`${formatCompactNumber(minMedianViews)}+ median views`}
              onRemove={() => onMinMedianViewsChange(undefined)}
            />
          )}
          {minEngagementPct !== undefined && (
            <FilterChip
              label={`${minEngagementPct}%+ engagement`}
              onRemove={() => onMinEngagementChange(undefined)}
            />
          )}
          {postedWithinDays !== undefined && (
            <FilterChip
              label={`Posted within ${postedWithinDays} days`}
              onRemove={() => onPostedWithinChange(undefined)}
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

      <p className="text-label text-text-muted">
        Filters hide creators. They don&rsquo;t change the sector fit score.
      </p>
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

function priceRangeLabel(minCents: number | undefined, maxCents: number | undefined): string {
  if (minCents !== undefined && maxCents !== undefined) {
    return `${formatCents(minCents)}–${formatCents(maxCents)}`;
  }
  if (minCents !== undefined) return `${formatCents(minCents)}+`;
  return `Up to ${formatCents(maxCents ?? 0)}`;
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

function PriceRangeFilter({
  minCents,
  maxCents,
  onChange,
}: {
  minCents: number | undefined;
  maxCents: number | undefined;
  onChange: (minCents: number | undefined, maxCents: number | undefined) => void;
}): JSX.Element {
  const [minInput, setMinInput] = useState(minCents !== undefined ? String(minCents / 100) : "");
  const [maxInput, setMaxInput] = useState(maxCents !== undefined ? String(maxCents / 100) : "");
  // Negative or inverted (min > max) input is kept on screen but never sent —
  // the committed filter (minCents/maxCents) stays at its last valid value.
  const [minInvalid, setMinInvalid] = useState(false);
  const [maxInvalid, setMaxInvalid] = useState(false);
  const [inverted, setInverted] = useState(false);

  useEffect(() => {
    setMinInput(minCents !== undefined ? String(minCents / 100) : "");
    setMinInvalid(false);
  }, [minCents]);
  useEffect(() => {
    setMaxInput(maxCents !== undefined ? String(maxCents / 100) : "");
    setMaxInvalid(false);
  }, [maxCents]);

  // Debounce so typing a price doesn't fire a request per keystroke. The UI
  // works in whole EUR; the wire format is integer cents.
  useEffect(() => {
    const handle = setTimeout(() => {
      const minEur = minInput.trim() === "" ? undefined : Number(minInput);
      const maxEur = maxInput.trim() === "" ? undefined : Number(maxInput);
      const minBad = minEur !== undefined && (Number.isNaN(minEur) || minEur < 0);
      const maxBad = maxEur !== undefined && (Number.isNaN(maxEur) || maxEur < 0);
      setMinInvalid(minBad);
      setMaxInvalid(maxBad);
      if (minBad || maxBad) {
        setInverted(false);
        return;
      }

      const nextMinCents = minEur !== undefined ? Math.round(minEur * 100) : undefined;
      const nextMaxCents = maxEur !== undefined ? Math.round(maxEur * 100) : undefined;
      if (nextMinCents !== undefined && nextMaxCents !== undefined && nextMinCents > nextMaxCents) {
        setInverted(true);
        return;
      }
      setInverted(false);

      if (nextMinCents === minCents && nextMaxCents === maxCents) return;
      onChange(nextMinCents, nextMaxCents);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minInput, maxInput]);

  return (
    <div className="flex flex-col gap-s1">
      <span className="text-label text-text-muted">Price (EUR)</span>
      <div className="flex items-center gap-s2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="Min"
          value={minInput}
          onChange={(event) => setMinInput(event.target.value)}
          className="w-24"
          invalid={minInvalid || inverted}
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
          invalid={maxInvalid || inverted}
        />
      </div>
      {inverted && <p className="text-label text-warn">Min price is above max price.</p>}
    </div>
  );
}

function DebouncedNumberFilter({
  label,
  placeholder,
  value,
  onChange,
  max,
}: {
  label: string;
  placeholder: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  /** Upper bound, e.g. 100 for a percentage. Undefined means no ceiling. */
  max?: number;
}): JSX.Element {
  const [input, setInput] = useState(value?.toString() ?? "");
  // A negative or over-the-ceiling value is kept on screen but never sent —
  // the committed filter (`value`) stays at its last valid setting.
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setInput(value?.toString() ?? "");
    setInvalid(false);
  }, [value]);

  // Debounce so typing a number doesn't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (input.trim() === "") {
        setInvalid(false);
        if (value !== undefined) onChange(undefined);
        return;
      }
      const next = Number(input);
      const bad = Number.isNaN(next) || next < 0 || (max !== undefined && next > max);
      setInvalid(bad);
      if (bad) return;
      if (next === value) return;
      onChange(next);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <label className="flex flex-col gap-s1">
      <span className="text-label text-text-muted">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        placeholder={placeholder}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        className="w-28"
        invalid={invalid}
      />
    </label>
  );
}

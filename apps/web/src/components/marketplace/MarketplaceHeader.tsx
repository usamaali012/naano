import type { CreatorSort } from "@naano/shared";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Tabs } from "../ui/Tabs";
import type { CreatorsTab } from "../../lib/stores/creatorsStore";

const SORT_OPTIONS: Array<{ value: CreatorSort; label: string }> = [
  { value: "best_match", label: "Best match" },
  { value: "price_asc", label: "Price low to high" },
  { value: "followers_desc", label: "Most followers" },
  { value: "engagement_desc", label: "Best engagement" },
];

interface MarketplaceHeaderProps {
  totalCount: number;
  shortlistCount: number;
  tab: CreatorsTab;
  onTabChange: (tab: CreatorsTab) => void;
  sort: CreatorSort;
  onSortChange: (sort: CreatorSort) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

export function MarketplaceHeader({
  totalCount,
  shortlistCount,
  tab,
  onTabChange,
  sort,
  onSortChange,
  query,
  onQueryChange,
}: MarketplaceHeaderProps): JSX.Element {
  const rankedView = tab === "all" && sort === "best_match";
  const sectionTitle =
    tab === "shortlist"
      ? "Your shortlist"
      : rankedView
        ? "Top ranked creators"
        : "All creators";

  return (
    <header className="flex flex-col gap-s6">
      <div className="flex flex-col gap-s2">
        <h1 className="text-page-title text-text">All creators</h1>
        <p className="max-w-2xl text-body text-text-muted">
          Ranked for your company, most relevant first: sector fit leads,
          verified performance refines the order.
        </p>
      </div>

      <Tabs
        value={tab}
        onChange={(value) => onTabChange(value as CreatorsTab)}
        items={[
          { value: "all", label: "All creators", count: totalCount },
          { value: "shortlist", label: "Shortlist", count: shortlistCount },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-s3">
        <Input
          type="search"
          placeholder="Search creators by name or focus"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="max-w-sm"
        />
        <label className="flex items-center gap-s2 whitespace-nowrap text-label text-text-muted">
          Sort by
          <Select
            className="min-w-[13rem]"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(event) => onSortChange(event.target.value as CreatorSort)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-s1">
        <h2 className="text-section-title text-text">{sectionTitle}</h2>
        {rankedView && totalCount > 0 && (
          <p className="text-label text-text-muted">
            The {totalCount} strongest profiles according to your sector and
            performance signals.
          </p>
        )}
      </div>
    </header>
  );
}

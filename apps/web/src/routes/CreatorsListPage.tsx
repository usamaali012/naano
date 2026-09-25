import { useEffect, useMemo, useState } from "react";
import type { MarketplaceCreator } from "@naano/shared";
import { api } from "../lib/api";
import { useCreatorsStore } from "../lib/stores/creatorsStore";
import { useShortlistStore } from "../lib/stores/shortlistStore";
import { useBookingsStore } from "../lib/stores/bookingsStore";
import { MarketplaceHeader } from "../components/marketplace/MarketplaceHeader";
import { FilterPanel } from "../components/marketplace/FilterPanel";
import { CreatorComparisonList } from "../components/marketplace/CreatorComparisonList";
import { CreatorsPagination } from "../components/marketplace/CreatorsPagination";
import { CreatorDetailPanel } from "../components/marketplace/CreatorDetailPanel";
import { Button } from "../components/ui/Button";

export function CreatorsListPage(): JSX.Element {
  const {
    page,
    pageSize,
    sort,
    q,
    tab,
    vertical,
    country,
    minFollowers,
    maxFollowers,
    priceMinCents,
    priceMaxCents,
    maxCpmEur,
    minMedianViews,
    minEngagementPct,
    postedWithinDays,
    setPage,
    setSort,
    setQuery,
    setTab,
    setVerticals,
    setCountry,
    setFollowerRange,
    setPriceRange,
    setMaxCpmEur,
    setMinMedianViews,
    setMinEngagementPct,
    setPostedWithinDays,
    clearPerformanceFilters,
  } = useCreatorsStore();

  const shortlistIds = useShortlistStore((state) => state.ids);
  const shortlistCampaignId = useShortlistStore((state) => state.campaignId);
  const hydrateShortlist = useShortlistStore((state) => state.hydrate);
  const toggleShortlist = useShortlistStore((state) => state.toggle);
  const addToShortlist = useShortlistStore((state) => state.add);
  const shortlistSet = useMemo(() => new Set(shortlistIds), [shortlistIds]);

  const bookingById = useBookingsStore((state) => state.byCreatorId);
  const hydrateBookings = useBookingsStore((state) => state.hydrate);

  const [creators, setCreators] = useState<MarketplaceCreator[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // The creator currently filling the persistent detail panel. Falls back to
  // the first row of whatever is on screen (see `activeCreatorId` below) so
  // the panel is never empty while the list has results — moving down the
  // list, paging, or changing a filter swaps the panel in place, with no
  // open/close step for the brand to perform.
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);

  useEffect(() => {
    void hydrateShortlist();
    void hydrateBookings();
  }, [hydrateShortlist, hydrateBookings]);

  // Debounce the search box so typing does not fire a request per keystroke.
  const [queryInput, setQueryInput] = useState(q);
  useEffect(() => {
    const handle = setTimeout(() => setQuery(queryInput), 250);
    return () => clearTimeout(handle);
  }, [queryInput, setQuery]);

  const onShortlistTab = tab === "shortlist";

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    const request = onShortlistTab
      ? shortlistCampaignId
        ? api.listShortlist(shortlistCampaignId, { pageSize: 100 })
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 })
      : api.listCreators({
          page,
          pageSize,
          sort,
          q: q || undefined,
          vertical: vertical.length > 0 ? vertical : undefined,
          country,
          minFollowers,
          maxFollowers,
          priceMinCents,
          priceMaxCents,
          maxCpmEur,
          minMedianViews,
          minEngagementPct,
          postedWithinDays,
        });

    request
      .then((result) => {
        if (cancelled) return;
        setCreators(result.items);
        if (!onShortlistTab) setAllTotal(result.total);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [
    onShortlistTab,
    shortlistCampaignId,
    page,
    pageSize,
    sort,
    q,
    vertical,
    country,
    minFollowers,
    maxFollowers,
    priceMinCents,
    priceMaxCents,
    maxCpmEur,
    minMedianViews,
    minEngagementPct,
    postedWithinDays,
    reloadKey,
  ]);

  function retry(): void {
    void hydrateShortlist();
    void hydrateBookings();
    setReloadKey((key) => key + 1);
  }

  // On the shortlist tab, drop rows the moment they are un-starred (optimistic).
  const displayed = onShortlistTab
    ? creators.filter((creator) => shortlistSet.has(creator.id))
    : creators;

  // Keep the explicit selection if it is still on screen; otherwise default
  // to the top row so the panel always shows someone once the list has
  // results, rather than sitting empty until the brand clicks a row.
  const activeCreatorId = displayed.some((creator) => creator.id === selectedCreatorId)
    ? selectedCreatorId
    : (displayed[0]?.id ?? null);

  function toggleSelect(id: string): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function shortlistSelected(): void {
    void addToShortlist([...selectedIds]);
    setSelectedIds(new Set());
  }

  return (
    <div className="flex flex-col gap-s6">
      <MarketplaceHeader
        totalCount={allTotal}
        shortlistCount={shortlistIds.length}
        tab={tab}
        onTabChange={(next) => {
          setTab(next);
          setSelectedIds(new Set());
        }}
        sort={sort}
        onSortChange={setSort}
        query={queryInput}
        onQueryChange={setQueryInput}
      />

      {!onShortlistTab && (
        <FilterPanel
          verticals={vertical}
          onVerticalsChange={setVerticals}
          country={country}
          onCountryChange={setCountry}
          minFollowers={minFollowers}
          maxFollowers={maxFollowers}
          onFollowerRangeChange={setFollowerRange}
          priceMinCents={priceMinCents}
          priceMaxCents={priceMaxCents}
          onPriceRangeChange={setPriceRange}
          maxCpmEur={maxCpmEur}
          onMaxCpmChange={setMaxCpmEur}
          minMedianViews={minMedianViews}
          onMinMedianViewsChange={setMinMedianViews}
          minEngagementPct={minEngagementPct}
          onMinEngagementChange={setMinEngagementPct}
          postedWithinDays={postedWithinDays}
          onPostedWithinChange={setPostedWithinDays}
        />
      )}

      {status === "loading" && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          Loading creators…
        </div>
      )}
      {status === "error" && (
        <div className="flex flex-col items-start gap-s3 rounded-card border border-border bg-surface p-s8">
          <div className="flex flex-col gap-s1">
            <p className="text-card-title text-text">
              The marketplace didn&rsquo;t load
            </p>
            <p className="text-body text-text-muted">
              That is usually a brief drop in the connection. Try again in a
              moment.
            </p>
          </div>
          <Button size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {status === "ready" && (
        <>
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-s3 rounded-card border border-border bg-surface px-s4 py-s3">
              <span className="text-body text-text">
                {selectedIds.size} selected
              </span>
              <Button size="sm" onClick={shortlistSelected}>
                Add to shortlist
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear selection
              </Button>
            </div>
          )}

          {displayed.length === 0 ? (
            <EmptyState
              tab={tab}
              query={q}
              hasFilters={
                vertical.length > 0 ||
                country !== undefined ||
                minFollowers !== undefined ||
                maxFollowers !== undefined ||
                priceMinCents !== undefined ||
                priceMaxCents !== undefined ||
                maxCpmEur !== undefined ||
                minMedianViews !== undefined ||
                minEngagementPct !== undefined ||
                postedWithinDays !== undefined
              }
              onClearQuery={() => {
                setQueryInput("");
                setQuery("");
              }}
              onClearFilters={() => {
                setVerticals([]);
                setCountry(undefined);
                setFollowerRange(undefined, undefined);
                clearPerformanceFilters();
              }}
              onBrowseAll={() => setTab("all")}
            />
          ) : (
            <div className="flex flex-col gap-s6 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-s4">
                <CreatorComparisonList
                  creators={displayed}
                  selectedIds={selectedIds}
                  shortlistIds={shortlistSet}
                  bookingById={bookingById}
                  activeId={activeCreatorId}
                  onToggleSelect={toggleSelect}
                  onToggleShortlist={toggleShortlist}
                  onSelect={setSelectedCreatorId}
                />
                {!onShortlistTab && (
                  <CreatorsPagination
                    page={page}
                    pageSize={pageSize}
                    total={allTotal}
                    onPageChange={setPage}
                  />
                )}
              </div>

              <div className="w-full shrink-0 lg:sticky lg:top-8 lg:w-[440px]">
                <CreatorDetailPanel
                  creatorId={activeCreatorId}
                  shortlisted={activeCreatorId ? shortlistSet.has(activeCreatorId) : false}
                  onToggleShortlist={toggleShortlist}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface EmptyStateProps {
  tab: "all" | "shortlist";
  query: string;
  hasFilters: boolean;
  onClearQuery: () => void;
  onClearFilters: () => void;
  onBrowseAll: () => void;
}

function EmptyState({
  tab,
  query,
  hasFilters,
  onClearQuery,
  onClearFilters,
  onBrowseAll,
}: EmptyStateProps): JSX.Element {
  if (tab === "shortlist") {
    return (
      <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
        No saved creators yet. Star a creator in the marketplace to build your
        shortlist.{" "}
        <button
          type="button"
          onClick={onBrowseAll}
          className="font-medium text-primary"
        >
          Browse all creators
        </button>
      </div>
    );
  }
  if (query || hasFilters) {
    const subject =
      query && hasFilters
        ? `your search and filters`
        : query
          ? `“${query}”`
          : "your filters";
    return (
      <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
        No creators match {subject}.{" "}
        <button
          type="button"
          onClick={() => {
            onClearQuery();
            onClearFilters();
          }}
          className="font-medium text-primary"
        >
          Clear {query && hasFilters ? "search and filters" : query ? "the search" : "filters"}
        </button>{" "}
        to see every creator.
      </div>
    );
  }
  return (
    <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
      No creators available yet.
    </div>
  );
}

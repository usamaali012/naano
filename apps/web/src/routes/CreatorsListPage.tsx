import { useEffect, useMemo, useState } from "react";
import type { MarketplaceCreator } from "@naano/shared";
import { api } from "../lib/api";
import { useCreatorsStore } from "../lib/stores/creatorsStore";
import { useShortlistStore } from "../lib/stores/shortlistStore";
import { MarketplaceHeader } from "../components/marketplace/MarketplaceHeader";
import { FilterPanel } from "../components/marketplace/FilterPanel";
import { CreatorGrid } from "../components/marketplace/CreatorGrid";
import { CreatorsPagination } from "../components/marketplace/CreatorsPagination";
import { CreatorProfileModal } from "../components/marketplace/CreatorProfileModal";
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
    setPage,
    setSort,
    setQuery,
    setTab,
    setVerticals,
    setCountry,
    setFollowerRange,
  } = useCreatorsStore();

  const shortlistIds = useShortlistStore((state) => state.ids);
  const shortlistCampaignId = useShortlistStore((state) => state.campaignId);
  const hydrateShortlist = useShortlistStore((state) => state.hydrate);
  const toggleShortlist = useShortlistStore((state) => state.toggle);
  const addToShortlist = useShortlistStore((state) => state.add);
  const shortlistSet = useMemo(() => new Set(shortlistIds), [shortlistIds]);

  const [creators, setCreators] = useState<MarketplaceCreator[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openCreatorId, setOpenCreatorId] = useState<string | null>(null);

  useEffect(() => {
    void hydrateShortlist();
  }, [hydrateShortlist]);

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
  ]);

  // On the shortlist tab, drop rows the moment they are un-starred (optimistic).
  const displayed = onShortlistTab
    ? creators.filter((creator) => shortlistSet.has(creator.id))
    : creators;

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
        />
      )}

      {status === "loading" && (
        <p className="text-body text-text-muted">Loading creators…</p>
      )}
      {status === "error" && (
        <p className="text-body text-warn">
          Could not load creators. Check that the API is running.
        </p>
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
                maxFollowers !== undefined
              }
              onClearQuery={() => {
                setQueryInput("");
                setQuery("");
              }}
              onClearFilters={() => {
                setVerticals([]);
                setCountry(undefined);
                setFollowerRange(undefined, undefined);
              }}
              onBrowseAll={() => setTab("all")}
            />
          ) : (
            <>
              <CreatorGrid
                creators={displayed}
                selectedIds={selectedIds}
                shortlistIds={shortlistSet}
                onToggleSelect={toggleSelect}
                onToggleShortlist={toggleShortlist}
                onOpen={setOpenCreatorId}
              />
              {!onShortlistTab && (
                <CreatorsPagination
                  page={page}
                  pageSize={pageSize}
                  total={allTotal}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </>
      )}

      <CreatorProfileModal
        creatorId={openCreatorId}
        onClose={() => setOpenCreatorId(null)}
        shortlisted={openCreatorId ? shortlistSet.has(openCreatorId) : false}
        onToggleShortlist={toggleShortlist}
      />
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

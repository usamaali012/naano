import { useEffect, useMemo, useState } from "react";
import type { MarketplaceCreator } from "@naano/shared";
import { api } from "../lib/api";
import { useCreatorsStore } from "../lib/stores/creatorsStore";
import { useShortlistStore } from "../lib/stores/shortlistStore";
import { MarketplaceHeader } from "../components/marketplace/MarketplaceHeader";
import { CreatorGrid } from "../components/marketplace/CreatorGrid";
import { CreatorsPagination } from "../components/marketplace/CreatorsPagination";
import { CreatorProfileModal } from "../components/marketplace/CreatorProfileModal";
import { Button } from "../components/ui/Button";

export function CreatorsListPage(): JSX.Element {
  const { page, pageSize, sort, q, tab, setPage, setSort, setQuery, setTab } =
    useCreatorsStore();

  const shortlistIds = useShortlistStore((state) => state.ids);
  const shortlistCampaignId = useShortlistStore((state) => state.campaignId);
  const hydrateShortlist = useShortlistStore((state) => state.hydrate);
  const toggleShortlist = useShortlistStore((state) => state.toggle);
  const addToShortlist = useShortlistStore((state) => state.add);
  const shortlistSet = useMemo(() => new Set(shortlistIds), [shortlistIds]);

  const [creators, setCreators] = useState<MarketplaceCreator[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
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
      : api.listCreators({ page, pageSize, sort, q: q || undefined });

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
  }, [onShortlistTab, shortlistCampaignId, page, pageSize, sort, q, reloadKey]);

  function retry(): void {
    void hydrateShortlist();
    setReloadKey((key) => key + 1);
  }

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
              onClearQuery={() => {
                setQueryInput("");
                setQuery("");
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
  onClearQuery: () => void;
  onBrowseAll: () => void;
}

function EmptyState({
  tab,
  query,
  onClearQuery,
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
  if (query) {
    return (
      <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
        No creators match &ldquo;{query}&rdquo;.{" "}
        <button
          type="button"
          onClick={onClearQuery}
          className="font-medium text-primary"
        >
          Clear the search
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

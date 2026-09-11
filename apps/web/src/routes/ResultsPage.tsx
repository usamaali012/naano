import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AttributionRow } from "@naano/shared";
import { api } from "../lib/api";
import { AttributionTable } from "../components/dashboard/AttributionTable";
import { CreatorsPagination } from "../components/marketplace/CreatorsPagination";
import { Button } from "../components/ui/Button";

const PAGE_SIZE = 20;

// Clicks attributed per creator for the signed-in brand (5.4). Fetches on
// every mount with no store cache, so a click on a tracked link shows the
// next time this page is opened, not only after a hard refresh.
export function ResultsPage(): JSX.Element {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AttributionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasAnyClicks, setHasAnyClicks] = useState(false);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    api
      .listAttribution({ page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;
        setRows(result.items);
        setTotal(result.total);
        setHasAnyClicks(result.hasAnyClicks);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  return (
    <div className="flex flex-col gap-s6">
      <div className="flex flex-col gap-s1">
        <h1 className="text-page-title text-text">Results</h1>
        <p className="text-body text-text-muted">
          Clicks on each creator&rsquo;s tracked link, across every campaign
          you&rsquo;ve run.
        </p>
      </div>

      {status === "loading" && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          Loading results…
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-start gap-s3 rounded-card border border-border bg-surface p-s8">
          <div className="flex flex-col gap-s1">
            <p className="text-card-title text-text">Results didn&rsquo;t load</p>
            <p className="text-body text-text-muted">
              That is usually a brief drop in the connection. Try again in a
              moment.
            </p>
          </div>
          <Button size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Try again
          </Button>
        </div>
      )}

      {status === "ready" && rows.length === 0 && (
        <div className="flex flex-col items-start gap-s3 rounded-card border border-border bg-surface p-s8">
          <p className="text-body text-text-muted">
            Clicks are tracked once a creator accepts a booking.
          </p>
          <Button size="sm" onClick={() => navigate("/app/collaborations")}>
            Go to Collaborations
          </Button>
        </div>
      )}

      {status === "ready" && rows.length > 0 && !hasAnyClicks && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          No clicks yet. Once someone clicks a creator&rsquo;s tracked link,
          it shows up here.
        </div>
      )}

      {status === "ready" && rows.length > 0 && hasAnyClicks && (
        <>
          <AttributionTable rows={rows} />
          <CreatorsPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

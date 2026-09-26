import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AttributionRow, CampaignOverview, ResultsOverview } from "@naano/shared";
import { api } from "../lib/api";
import { AttributionTable } from "../components/dashboard/AttributionTable";
import { KpiRow } from "../components/dashboard/KpiRow";
import { ClicksChart } from "../components/dashboard/ClicksChart";
import { BookingPipeline } from "../components/dashboard/BookingPipeline";
import { ClicksByCreator } from "../components/dashboard/ClicksByCreator";
import { SpendByCampaign } from "../components/dashboard/SpendByCampaign";
import { CreatorsPagination } from "../components/marketplace/CreatorsPagination";
import { Button } from "../components/ui/Button";

const PAGE_SIZE = 20;
const TOP_CREATORS_COUNT = 8;

// A real dashboard on top of the attribution table this page used to be
// (5.4): KPIs, a clicks-per-day chart, the booking pipeline, top creators by
// clicks, and spend by campaign, all reading live /analytics/overview
// aggregates (W9). Everything fetches on every mount with no store cache, so
// a click on a tracked link shows the next time this page is opened, not
// only after a hard refresh.
export function ResultsPage(): JSX.Element {
  const navigate = useNavigate();

  // KPIs + charts: one fetch, one status, kept independent of the
  // attribution table's own pagination below so paging the table never
  // reloads the dashboard above it.
  const [overview, setOverview] = useState<ResultsOverview | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignOverview[]>([]);
  const [topCreators, setTopCreators] = useState<AttributionRow[]>([]);
  const [dashboardStatus, setDashboardStatus] = useState<"loading" | "error" | "ready">(
    "loading",
  );
  const [dashboardReloadKey, setDashboardReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setDashboardStatus("loading");
    Promise.all([
      api.getResultsOverview(),
      api.listCampaigns({ pageSize: 50 }),
      api.listAttribution({ page: 1, pageSize: TOP_CREATORS_COUNT }),
    ])
      .then(([overviewResult, campaignsResult, attributionResult]) => {
        if (cancelled) return;
        setOverview(overviewResult);
        setCampaigns(campaignsResult.items);
        setTopCreators(attributionResult.items);
        setDashboardStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setDashboardStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [dashboardReloadKey]);

  // The attribution table below the charts, unchanged: its own page state
  // and its own two empty states (no accepted bookings vs. no clicks yet).
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

      {dashboardStatus === "loading" && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          Loading your dashboard…
        </div>
      )}

      {dashboardStatus === "error" && (
        <div className="flex flex-col items-start gap-s3 rounded-card border border-border bg-surface p-s8">
          <div className="flex flex-col gap-s1">
            <p className="text-card-title text-text">Your dashboard didn&rsquo;t load</p>
            <p className="text-body text-text-muted">
              That is usually a brief drop in the connection. Try again in a
              moment.
            </p>
          </div>
          <Button size="sm" onClick={() => setDashboardReloadKey((key) => key + 1)}>
            Try again
          </Button>
        </div>
      )}

      {dashboardStatus === "ready" && overview && (
        <>
          <KpiRow overview={overview} />

          <div className="grid grid-cols-1 gap-s6 lg:grid-cols-2">
            <div className="flex flex-col gap-s4 rounded-card border border-border bg-surface p-s6">
              <div className="flex flex-col gap-s1">
                <h2 className="text-card-title text-text">Clicks per day</h2>
                <p className="text-label text-text-muted">Last 30 days.</p>
              </div>
              <ClicksChart days={overview.clicksByDay} />
            </div>

            <div className="flex flex-col gap-s4 rounded-card border border-border bg-surface p-s6">
              <div className="flex flex-col gap-s1">
                <h2 className="text-card-title text-text">Booking pipeline</h2>
                <p className="text-label text-text-muted">
                  Every non-declined booking, by stage.
                </p>
              </div>
              <BookingPipeline statuses={overview.bookingsByStatus} />
            </div>

            <div className="flex flex-col gap-s4 rounded-card border border-border bg-surface p-s6">
              <div className="flex flex-col gap-s1">
                <h2 className="text-card-title text-text">Clicks by creator</h2>
                <p className="text-label text-text-muted">
                  Top {TOP_CREATORS_COUNT}, across every campaign.
                </p>
              </div>
              <ClicksByCreator rows={topCreators} />
            </div>

            <div className="flex flex-col gap-s4 rounded-card border border-border bg-surface p-s6">
              <div className="flex flex-col gap-s1">
                <h2 className="text-card-title text-text">Spend by campaign</h2>
                <p className="text-label text-text-muted">
                  Paid, committed, and invited against budget.
                </p>
              </div>
              <SpendByCampaign campaigns={campaigns} />
            </div>
          </div>
        </>
      )}

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

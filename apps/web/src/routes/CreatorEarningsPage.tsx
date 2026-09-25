import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CreatorEarnings } from "@naano/shared";
import { api } from "../lib/api";
import { EarningsChart } from "../components/creator/EarningsChart";
import { formatCents } from "../lib/format";

// The creator's own money in one screen. Every figure is already net of
// commission — the API did that (CreatorEarnings.*Cents), nothing here
// recomputes it. Deliberately no withdraw control and no "available to
// withdraw" balance: payment rails are cut, and a balance a creator can't
// withdraw is a control that does nothing.
export function CreatorEarningsPage(): JSX.Element {
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    api
      .getEarnings()
      .then((result) => {
        if (cancelled) return;
        setEarnings(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const nothingYet =
    earnings !== null &&
    earnings.paidCollaborationsCount === 0 &&
    earnings.inTransitCents === 0;

  return (
    <div className="flex flex-col gap-s6">
      <div className="flex flex-col gap-s1">
        <h1 className="text-page-title text-text">Earnings</h1>
        <p className="text-body text-text-muted">
          Every figure here is already net of naano&rsquo;s commission — what
          you actually keep.
        </p>
      </div>

      {status === "loading" && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          Loading your earnings…
        </div>
      )}
      {status === "error" && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          Could not load your earnings. Reload the page to try again.
        </div>
      )}

      {status === "ready" && earnings && nothingYet && (
        <div className="flex flex-col gap-s2 rounded-card border border-border bg-surface p-s8">
          <p className="text-card-title text-text">No earnings yet</p>
          <p className="text-body text-text-muted">
            Once you accept a collaboration and it moves toward paid, its
            value shows up here.{" "}
            <Link to="/app/collaborations" className="font-medium text-primary">
              See your collaborations
            </Link>
            .
          </p>
        </div>
      )}

      {status === "ready" && earnings && !nothingYet && (
        <>
          <dl className="grid grid-cols-2 gap-s4 rounded-card border border-border bg-surface p-s6 sm:grid-cols-4">
            <div className="flex flex-col gap-s1">
              <dd className="text-metric tabular-nums text-text">
                {formatCents(earnings.totalEarnedCents)}
              </dd>
              <dt className="text-label text-text-muted">Total earned</dt>
            </div>
            <div className="flex flex-col gap-s1">
              <dd className="text-metric tabular-nums text-text">
                {earnings.paidCollaborationsCount}
              </dd>
              <dt className="text-label text-text-muted">Paid collaborations</dt>
            </div>
            <div className="flex flex-col gap-s1">
              <dd className="text-metric tabular-nums text-text">
                {formatCents(earnings.averageCents)}
              </dd>
              <dt className="text-label text-text-muted">Average per deal</dt>
            </div>
            <div className="flex flex-col gap-s1">
              <dd className="text-metric tabular-nums text-text">
                {formatCents(earnings.inTransitCents)}
              </dd>
              <dt className="text-label text-text-muted">In transit</dt>
            </div>
          </dl>

          <div className="flex flex-col gap-s4 rounded-card border border-border bg-surface p-s6">
            <div className="flex flex-col gap-s1">
              <h2 className="text-card-title text-text">Earnings over time</h2>
              <p className="text-label text-text-muted">
                Net collaboration earnings by month, oldest to newest.
              </p>
            </div>
            <EarningsChart months={earnings.monthly} />
          </div>
        </>
      )}
    </div>
  );
}

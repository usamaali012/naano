import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type {
  ActionCount,
  CreatorCollaboration,
  CreatorEarnings,
  CreatorProfileDetail,
} from "@naano/shared";
import { api } from "../lib/api";
import { ApiError } from "../lib/api/errors";
import { useAuthStore } from "../lib/stores/authStore";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SegmentedBar } from "../components/ui/SegmentedBar";
import { segmentsFor } from "../components/marketplace/modal/audienceSegments";
import { EarningsChart } from "../components/creator/EarningsChart";
import {
  formatCents,
  formatCompactNumber,
  formatCpm,
  verticalLabel,
} from "../lib/format";

// Keep in sync with apps/api/src/creators/dto/update-my-card.dto.ts.
const MIN_PRICE_CENTS = 5_000;
const MAX_PRICE_CENTS = 2_250_000;

interface HomeData {
  detail: CreatorProfileDetail;
  earnings: CreatorEarnings;
  actionCount: ActionCount;
  /** Up to three received bookings whose next move is the creator's. */
  needsYou: CreatorCollaboration[];
}

// What a signed-in creator lands on: a real overview, not the four zeros
// naano's own Overview opens on (docs/RECON-CREATOR.md, "Problems worth
// fixing" #4) — tiles, next-action rows and an earnings trend, all from
// getCreator/getEarnings/getActionCount/listBookingsReceived, plus the
// creator's own card (identical to what GET /creators/:id shows a brand) as
// a preview alongside it. Collaborations and Earnings stay their own routes
// (the rail's other two items); this page summarises, it doesn't replace them.
export function CreatorHomePage(): JSX.Element {
  const me = useAuthStore((state) => state.me);
  const creatorProfileId = me?.creatorProfileId ?? null;

  const [data, setData] = useState<HomeData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [editing, setEditing] = useState(false);

  // Desktop-only sizing for the sticky card column, copied from W6
  // (CreatorsListPage.tsx / docs/DECISIONS.md) rather than extracted into a
  // shared hook per this session's ask — capped to whichever is shorter, the
  // viewport below the real top bar or the left column's own height, with a
  // 560px floor. Narrow screens ignore all of this and stack normally.
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false,
  );
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerHeight : 0,
  );
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [leftColumnHeight, setLeftColumnHeight] = useState(0);
  const leftColumnObserverRef = useRef<ResizeObserver | null>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    function onResize(): void {
      setViewportHeight(window.innerHeight);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // `main > header` is AppShell's own top bar, the only header that is a
  // direct child of `main`. getBoundingClientRect (border-box) in both the
  // initial call and every ResizeObserver callback, not entry.contentRect
  // (content-box), which under-reports the real height — the same gotcha W6
  // hit and fixed.
  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>("main > header");
    if (!header) return;
    const measure = () => setTopBarHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const setLeftColumnRef = useCallback((node: HTMLDivElement | null) => {
    leftColumnObserverRef.current?.disconnect();
    leftColumnObserverRef.current = null;
    if (node) {
      const measure = () => setLeftColumnHeight(node.getBoundingClientRect().height);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      leftColumnObserverRef.current = observer;
    }
  }, []);

  const PANEL_BOTTOM_GUTTER = 32; // matches the page's own p-s8 bottom padding
  const PANEL_MIN_HEIGHT = 560; // floor so a short left column doesn't shrink the card below usable
  const panelAvailableHeight =
    topBarHeight > 0 && viewportHeight > 0
      ? Math.max(0, viewportHeight - topBarHeight - PANEL_BOTTOM_GUTTER)
      : undefined;
  const panelHeight =
    panelAvailableHeight !== undefined
      ? Math.max(
          Math.min(panelAvailableHeight, PANEL_MIN_HEIGHT),
          leftColumnHeight > 0
            ? Math.min(leftColumnHeight, panelAvailableHeight)
            : panelAvailableHeight,
        )
      : undefined;
  const panelStyle =
    isDesktop && topBarHeight > 0 && panelHeight !== undefined
      ? { top: topBarHeight, height: panelHeight }
      : undefined;

  // Entering or leaving edit mode always starts the card column scrolled to
  // the top, same as W6 resets on selection change.
  useEffect(() => {
    cardScrollRef.current?.scrollTo({ top: 0 });
  }, [editing]);

  useEffect(() => {
    if (!creatorProfileId) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    Promise.all([
      api.getCreator(creatorProfileId),
      api.getEarnings(),
      api.getActionCount(),
      api.listBookingsReceived({ pageSize: 20 }),
    ])
      .then(([detail, earnings, actionCount, bookings]) => {
        if (cancelled) return;
        setData({
          detail,
          earnings,
          actionCount,
          needsYou: bookings.items
            .filter((booking) => booking.nextAction.consequence !== "")
            .slice(0, 3),
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [creatorProfileId]);

  if (status === "loading" || !data) {
    return <p className="text-body text-text-muted">Loading your overview…</p>;
  }
  if (status === "error") {
    return (
      <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
        Could not load your overview. Reload the page to try again.
      </div>
    );
  }

  const { detail, earnings, actionCount, needsYou } = data;
  const firstName = detail.displayName.split(" ")[0];

  const metrics: Array<[string, string]> = [
    ["Followers", formatCompactNumber(detail.followerCount)],
    ["Median views", formatCompactNumber(detail.medianViews)],
    ["CPM", formatCpm(detail.postCostCents, detail.medianViews)],
    ["Post cost", formatCents(detail.postCostCents)],
    ["Bundle of 5", formatCents(detail.bundle5PriceCents)],
  ];

  return (
    <div className="flex flex-col gap-s6">
      <div className="flex flex-col gap-s1">
        <h1 className="text-page-title text-text">Good to see you, {firstName}</h1>
        <p className="text-body text-text-muted">
          {actionCount.count === 0
            ? "Nothing needs you right now."
            : `${actionCount.count} collaboration${actionCount.count === 1 ? "" : "s"} need${
                actionCount.count === 1 ? "s" : ""
              } you.`}
        </p>
      </div>

      <div className="flex flex-col gap-s6 lg:flex-row lg:items-start">
        <div ref={setLeftColumnRef} className="flex min-w-0 flex-1 flex-col gap-s6">
          <dl className="grid grid-cols-2 gap-s4">
            <OverviewTile
              label="Earned"
              value={formatCents(earnings.totalEarnedCents)}
              caption={
                earnings.paidCollaborationsCount === 0
                  ? "No paid collaborations yet"
                  : `${earnings.paidCollaborationsCount} paid, ${formatCents(
                      earnings.averageCents,
                    )} average`
              }
            />
            <OverviewTile
              label="In transit"
              value={formatCents(earnings.inTransitCents)}
              caption={
                earnings.inTransitCents === 0
                  ? "Nothing in transit right now"
                  : "Arrives in 1 to 7 days"
              }
            />
            <OverviewTile
              label="Needs you"
              value={String(actionCount.count)}
              caption={
                actionCount.count === 0
                  ? "Nothing needs you right now"
                  : "Waiting on your next move"
              }
            />
            <OverviewTile
              label="Your price"
              value={formatCents(detail.postCostCents)}
              caption={`Single post, CPM ${formatCpm(detail.postCostCents, detail.medianViews)}`}
            />
          </dl>

          <section className="flex flex-col gap-s4 rounded-card border border-border bg-surface p-s6">
            <h2 className="text-card-title text-text">Needs you</h2>
            {needsYou.length === 0 ? (
              <p className="text-body text-text-muted">
                Nothing needs your attention right now. New collaborations will
                show up here.
              </p>
            ) : (
              <ul className="flex flex-col gap-s3">
                {needsYou.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      to="/app/collaborations"
                      className="flex flex-wrap items-start justify-between gap-s3 rounded-card border border-border p-s4 transition-colors hover:border-primary"
                    >
                      <div className="flex flex-col gap-s1">
                        <span className="text-card-title text-text">
                          {booking.companyName}
                        </span>
                        <span className="text-label text-text-muted">
                          {booking.campaignName}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-s1 text-right">
                        <span className="text-body font-medium text-primary">
                          {booking.nextAction.label}
                        </span>
                        <span className="text-metric tabular-nums text-text">
                          {formatCents(booking.netCents)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-s4 rounded-card border border-border bg-surface p-s6">
            <div className="flex flex-wrap items-baseline justify-between gap-s2">
              <h2 className="text-card-title text-text">Earnings</h2>
              <Link to="/app/earnings" className="text-label font-medium text-primary">
                See earnings
              </Link>
            </div>
            <EarningsChart months={earnings.monthly} />
          </section>
        </div>

        <div className="w-full shrink-0 lg:sticky lg:w-[440px]" style={panelStyle}>
          <div className="flex h-full min-h-0 flex-col rounded-card border border-border bg-surface">
            <header className="flex shrink-0 items-center justify-between gap-s4 border-b border-border p-s6">
              <div className="flex min-w-0 items-center gap-s4">
                <Avatar
                  src={detail.avatarUrl}
                  name={detail.displayName}
                  className="h-16 w-16 shrink-0"
                />
                <h2 className="truncate text-section-title text-text">{detail.displayName}</h2>
              </div>
              {!editing && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setEditing(true)}
                >
                  Edit card
                </Button>
              )}
            </header>

            <div
              ref={cardScrollRef}
              className="min-h-0 flex-1 overflow-y-auto p-s6 [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
            >
              <div className="flex flex-col gap-s6">
                <p className="text-label text-text-muted">
                  This is exactly how brands see you.
                </p>

                {editing ? (
                  <EditCardForm
                    detail={detail}
                    onCancel={() => setEditing(false)}
                    onSaved={(next) => {
                      setData((prev) => (prev ? { ...prev, detail: next } : prev));
                      setEditing(false);
                    }}
                  />
                ) : (
                  <>
                    <div className="flex flex-col gap-s1">
                      <p className="text-label text-text-muted">
                        {verticalLabel(detail.vertical)} creator on LinkedIn
                        <span className="ml-s2">{detail.country}</span>
                      </p>
                      <p className="text-body text-text-muted">{detail.headline}</p>
                    </div>

                    <dl className="grid grid-cols-2 gap-s4">
                      {metrics.map(([label, value]) => (
                        <div key={label} className="flex flex-col gap-s1">
                          <dd className="text-metric tabular-nums text-text">{value}</dd>
                          <dt className="text-label text-text-muted">{label}</dt>
                        </div>
                      ))}
                    </dl>
                  </>
                )}

                <section className="flex flex-col gap-s4 border-t border-border pt-s6">
                  <div className="flex flex-wrap items-baseline justify-between gap-s2">
                    <h3 className="text-card-title text-text">Audience snapshot</h3>
                    <span className="text-label text-text-muted">
                      Estimated from {detail.observedEngagerCount} recent public engagers
                    </span>
                  </div>
                  <div className="flex flex-col gap-s6">
                    <div className="flex flex-col gap-s3">
                      <span className="text-label text-text-muted">Job title</span>
                      <SegmentedBar segments={segmentsFor(detail, "JOB_TITLE")} />
                    </div>
                    <div className="flex flex-col gap-s3">
                      <span className="text-label text-text-muted">Seniority</span>
                      <SegmentedBar segments={segmentsFor(detail, "SENIORITY")} />
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-s3 border-t border-border pt-s6">
                  <h3 className="text-card-title text-text">
                    Recent posts ({detail.posts.length})
                  </h3>
                  <ul className="flex flex-col gap-s3">
                    {detail.posts.map((post) => (
                      <li
                        key={post.id}
                        className="flex flex-col gap-s2 rounded-card border border-border p-s4"
                      >
                        <div className="flex items-baseline justify-between gap-s3">
                          <span className="text-label text-text-muted">
                            {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <a
                            href={post.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-label font-medium text-primary"
                          >
                            Open original
                          </a>
                        </div>
                        <p className="line-clamp-2 text-body text-text">
                          {post.content.replace(/\s+/g, " ")}
                        </p>
                        <div className="flex flex-wrap gap-s4 text-label tabular-nums text-text-muted">
                          <span>{formatCompactNumber(post.views)} views</span>
                          <span>{formatCompactNumber(post.reactions)} reactions</span>
                          <span>{formatCompactNumber(post.comments)} comments</span>
                          <span>{formatCompactNumber(post.reposts)} reposts</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// One of the four Overview tiles. Never a bare number: every tile carries a
// caption explaining what's behind it, so a zero reads as "nothing yet" and
// not as a broken page (docs/RECON-CREATOR.md, "Problems worth fixing" #4).
function OverviewTile({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-s1 rounded-card border border-border bg-surface p-s4">
      <dd className="text-metric tabular-nums text-text">{value}</dd>
      <dt className="text-label text-text-muted">{label}</dt>
      <p className="text-label text-text-muted">{caption}</p>
    </div>
  );
}

/** EUR input text -> integer cents, or null if empty/not a valid non-negative number. */
function eurToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const eur = Number(trimmed);
  if (!Number.isFinite(eur) || eur < 0) return null;
  return Math.round(eur * 100);
}

// The card's headline/price fields, switched in in place of the profile
// header + metrics — no modal, per docs/PLAN.md's W4. Followers/median views
// stay read-only (out of scope here); CPM is recomputed live from the shared
// formula as the creator types, never a copy of it.
function EditCardForm({
  detail,
  onCancel,
  onSaved,
}: {
  detail: CreatorProfileDetail;
  onCancel: () => void;
  onSaved: (next: CreatorProfileDetail) => void;
}): JSX.Element {
  const [headline, setHeadline] = useState(detail.headline);
  const [postCostEur, setPostCostEur] = useState(String(detail.postCostCents / 100));
  const [bundleEur, setBundleEur] = useState(String(detail.bundle5PriceCents / 100));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headlineTrimmed = headline.trim();
  const headlineValid = headlineTrimmed.length >= 1 && headlineTrimmed.length <= 160;

  const postCostCents = eurToCents(postCostEur);
  const bundleCents = eurToCents(bundleEur);
  const postCostValid =
    postCostCents !== null && postCostCents >= MIN_PRICE_CENTS && postCostCents <= MAX_PRICE_CENTS;
  const bundleInRange =
    bundleCents !== null && bundleCents >= MIN_PRICE_CENTS && bundleCents <= MAX_PRICE_CENTS;
  const bundleAgainstPost =
    postCostCents !== null && bundleCents !== null
      ? bundleCents >= postCostCents && bundleCents <= postCostCents * 5
      : false;
  const bundleValid = bundleInRange && bundleAgainstPost;

  const canSave = headlineValid && postCostValid && bundleValid && !saving;

  // Bundle CPM is per-post, same convention BookingRail uses for its own
  // bundle price: divide by five before the shared formula, never a copy.
  const bundlePerPostCents = bundleCents !== null ? Math.round(bundleCents / 5) : null;

  async function save(): Promise<void> {
    if (!canSave || postCostCents === null || bundleCents === null) return;
    setSaving(true);
    setError(null);
    try {
      const next = await api.updateMyCard({
        headline: headlineTrimmed,
        postCostCents,
        bundle5PriceCents: bundleCents,
      });
      onSaved(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your card. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-s4">
      <div className="flex flex-col gap-s2">
        <label htmlFor="edit-card-headline" className="text-label text-text-muted">
          Headline
        </label>
        <Input
          id="edit-card-headline"
          value={headline}
          disabled={saving}
          onChange={(e) => setHeadline(e.target.value)}
          invalid={!headlineValid}
        />
        {!headlineValid && (
          <p className="text-label text-warn">Headline must be 1 to 160 characters.</p>
        )}
      </div>

      <div className="flex flex-col gap-s4">
        <div className="flex flex-col gap-s2">
          <label htmlFor="edit-card-post-cost" className="text-label text-text-muted">
            Single post price (EUR)
          </label>
          <Input
            id="edit-card-post-cost"
            type="number"
            inputMode="numeric"
            min={0}
            value={postCostEur}
            disabled={saving}
            onChange={(e) => setPostCostEur(e.target.value)}
            invalid={!postCostValid}
          />
          {postCostCents !== null && (
            <span className="text-label text-text-muted">
              CPM {formatCpm(postCostCents, detail.medianViews)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-s2">
          <label htmlFor="edit-card-bundle" className="text-label text-text-muted">
            Bundle of five price (EUR)
          </label>
          <Input
            id="edit-card-bundle"
            type="number"
            inputMode="numeric"
            min={0}
            value={bundleEur}
            disabled={saving}
            onChange={(e) => setBundleEur(e.target.value)}
            invalid={!bundleValid}
          />
          {bundlePerPostCents !== null && (
            <span className="text-label text-text-muted">
              CPM {formatCpm(bundlePerPostCents, detail.medianViews)}
            </span>
          )}
        </div>
      </div>

      {!postCostValid && (
        <p className="text-label text-warn">
          Single post price must be between {formatCents(MIN_PRICE_CENTS)} and{" "}
          {formatCents(MAX_PRICE_CENTS)}.
        </p>
      )}
      {postCostValid && !bundleInRange && (
        <p className="text-label text-warn">
          Bundle price must be between {formatCents(MIN_PRICE_CENTS)} and{" "}
          {formatCents(MAX_PRICE_CENTS)}.
        </p>
      )}
      {postCostValid && bundleInRange && !bundleAgainstPost && (
        <p className="text-label text-warn">
          Bundle-of-5 price must be at least the single-post price and at most 5x it.
        </p>
      )}

      <p className="text-label text-text-muted">
        Bookings already made keep the price agreed at the time.
      </p>

      {error && <p className="text-label text-warn">{error}</p>}

      <div className="flex gap-s2">
        <Button size="sm" disabled={!canSave} onClick={() => void save()}>
          Save
        </Button>
        <Button size="sm" variant="secondary" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

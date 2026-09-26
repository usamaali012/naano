import { useEffect, useState } from "react";
import type { CreatorProfileDetail } from "@naano/shared";
import { api } from "../lib/api";
import { ApiError } from "../lib/api/errors";
import { useAuthStore } from "../lib/stores/authStore";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { SegmentedBar } from "../components/ui/SegmentedBar";
import { segmentsFor } from "../components/marketplace/modal/audienceSegments";
import {
  formatCents,
  formatCompactNumber,
  formatCpm,
  verticalLabel,
} from "../lib/format";

// Keep in sync with apps/api/src/creators/dto/update-my-card.dto.ts.
const MIN_PRICE_CENTS = 5_000;
const MAX_PRICE_CENTS = 2_250_000;

// What a signed-in creator lands on: their own marketplace profile, exactly
// as a brand sees it. Real data from GET /creators/:id. Collaborations and
// Earnings are their own routes (the rail's other two items) — this page is
// the profile alone, not a catch-all.
export function CreatorHomePage(): JSX.Element {
  const me = useAuthStore((state) => state.me);
  const creatorProfileId = me?.creatorProfileId ?? null;

  const [detail, setDetail] = useState<CreatorProfileDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!creatorProfileId) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    api
      .getCreator(creatorProfileId)
      .then((result) => {
        if (cancelled) return;
        setDetail(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [creatorProfileId]);

  if (status === "loading") {
    return (
      <p className="text-body text-text-muted">Loading your profile…</p>
    );
  }
  if (status === "error" || !detail) {
    return (
      <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
        Could not load your profile. Reload the page to try again.
      </div>
    );
  }

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
        <h1 className="text-page-title text-text">Your profile</h1>
        <p className="text-body text-text-muted">
          This is exactly how brands see you in the marketplace.
        </p>
      </div>

      <div className="flex flex-col gap-s6 rounded-card border border-border bg-surface p-s6">
        {editing ? (
          <EditCardForm
            detail={detail}
            onCancel={() => setEditing(false)}
            onSaved={(next) => {
              setDetail(next);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-s4">
              <div className="flex items-center gap-s4">
                <Avatar
                  src={detail.avatarUrl}
                  name={detail.displayName}
                  className="h-16 w-16"
                />
                <div className="flex flex-col gap-s1">
                  <h2 className="text-section-title text-text">{detail.displayName}</h2>
                  <p className="text-label text-text-muted">
                    {verticalLabel(detail.vertical)} creator on LinkedIn
                    <span className="ml-s2">{detail.country}</span>
                  </p>
                  <p className="text-body text-text-muted">{detail.headline}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                Edit card
              </Button>
            </div>

            <dl className="grid grid-cols-2 gap-s4 sm:grid-cols-3 lg:grid-cols-5">
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
          <div className="grid gap-s6 sm:grid-cols-2">
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

      <div className="grid gap-s4 sm:grid-cols-2">
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

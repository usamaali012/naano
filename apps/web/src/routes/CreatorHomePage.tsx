import { useEffect, useState } from "react";
import type { BookingReceived, CreatorProfileDetail } from "@naano/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../lib/stores/authStore";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { SegmentedBar } from "../components/ui/SegmentedBar";
import { StatusPill } from "../components/ui/StatusPill";
import { segmentsFor } from "../components/marketplace/modal/audienceSegments";
import { bookingStatusLabel, bookingStatusTone } from "../lib/bookingStatus";
import {
  formatCents,
  formatCompactNumber,
  formatCpm,
  verticalLabel,
} from "../lib/format";

// What a signed-in creator lands on: their own marketplace profile, exactly as
// a brand sees it. Real data from GET /creators/:id — the creator side proper
// (collaborations, earnings) is Phase 4.
export function CreatorHomePage(): JSX.Element {
  const me = useAuthStore((state) => state.me);
  const creatorProfileId = me?.creatorProfileId ?? null;

  const [detail, setDetail] = useState<CreatorProfileDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  const [bookings, setBookings] = useState<BookingReceived[]>([]);
  const [bookingsStatus, setBookingsStatus] = useState<"loading" | "error" | "ready">(
    "loading",
  );
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorProfileId) {
      setBookingsStatus("error");
      return;
    }
    let cancelled = false;
    setBookingsStatus("loading");
    api
      .listBookingsReceived({ pageSize: 20 })
      .then((page) => {
        if (cancelled) return;
        setBookings(page.items);
        setBookingsStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setBookingsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [creatorProfileId]);

  async function respond(id: string, next: "ACCEPTED" | "DECLINED"): Promise<void> {
    setRespondingId(id);
    try {
      const updated = await api.updateBookingStatus(id, next);
      setBookings((current) =>
        current.map((b) => (b.id === id ? { ...b, status: updated.status } : b)),
      );
    } catch {
      // Leave the row as it was; the buttons re-enable so they can try again.
    } finally {
      setRespondingId(null);
    }
  }

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
  ];

  return (
    <div className="flex flex-col gap-s6">
      <div className="flex flex-col gap-s1">
        <h1 className="text-page-title text-text">Your profile</h1>
        <p className="text-body text-text-muted">
          This is exactly how brands see you in the marketplace.
        </p>
      </div>

      <section className="flex flex-col gap-s4 rounded-card border border-border bg-surface p-s6">
        <h2 className="text-card-title text-text">Booking requests</h2>

        {bookingsStatus === "loading" && (
          <p className="text-body text-text-muted">Loading booking requests…</p>
        )}
        {bookingsStatus === "error" && (
          <p className="text-body text-text-muted">
            Could not load your booking requests. Reload the page to try again.
          </p>
        )}
        {bookingsStatus === "ready" && bookings.length === 0 && (
          <p className="text-body text-text-muted">
            No booking requests yet. Brands will reach out here when they want
            to collaborate with you.
          </p>
        )}
        {bookingsStatus === "ready" && bookings.length > 0 && (
          <ul className="flex flex-col gap-s3">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-col gap-s3 rounded-card border border-border p-s4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-s1">
                  <div className="flex flex-wrap items-center gap-s2">
                    <span className="text-card-title text-text">
                      {booking.companyName}
                    </span>
                    <StatusPill
                      tone={bookingStatusTone(booking.status)}
                      label={bookingStatusLabel(booking.status)}
                    />
                  </div>
                  <p className="text-label text-text-muted">{booking.campaignName}</p>
                  <p className="text-body text-text">{booking.deliverable}</p>
                  <p className="tabular-nums text-label text-text-muted">
                    {formatCents(booking.agreedPriceCents)}
                  </p>
                </div>
                {booking.status === "INVITED" && (
                  <div className="flex gap-s2">
                    <Button
                      size="sm"
                      disabled={respondingId === booking.id}
                      onClick={() => void respond(booking.id, "ACCEPTED")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={respondingId === booking.id}
                      onClick={() => void respond(booking.id, "DECLINED")}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-s6 rounded-card border border-border bg-surface p-s6">
        <div className="flex items-center gap-s4">
          <Avatar
            src={detail.avatarUrl}
            name={detail.displayName}
            className="h-16 w-16"
          />
          <div>
            <h2 className="text-section-title text-text">{detail.displayName}</h2>
            <p className="text-label text-text-muted">
              {verticalLabel(detail.vertical)} creator on LinkedIn
              <span className="ml-s2">{detail.country}</span>
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-s4 sm:grid-cols-4">
          {metrics.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-s1">
              <dd className="text-metric tabular-nums text-text">{value}</dd>
              <dt className="text-label text-text-muted">{label}</dt>
            </div>
          ))}
        </dl>

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

import { useEffect, useState } from "react";
import type { BookingStatus, CreatorCollaboration } from "@naano/shared";
import { api } from "../lib/api";
import { CollaborationCard } from "../components/creator/CollaborationCard";

const PAGE_SIZE = 20;

// Consequence is non-empty exactly when the next move is the creator's — put
// those collaborations first so the screen reads as "here's what needs you,"
// not a plain reverse-chronological log. Stable sort keeps each group in the
// server's own createdAt-desc order.
function orderByNextAction(bookings: CreatorCollaboration[]): CreatorCollaboration[] {
  return [...bookings].sort((a, b) => {
    const aActionable = a.nextAction.consequence !== "" ? 0 : 1;
    const bActionable = b.nextAction.consequence !== "" ? 0 : 1;
    return aActionable - bActionable;
  });
}

// The creator's own Collaborations screen — every booking addressed to them,
// organised around nextAction rather than status alone. Its own route
// (/app/collaborations, same URL the brand's Collaborations table lives at —
// see App.tsx's CollaborationsIndex) now that a creator has a real rail with
// three destinations, not a section folded into their profile page.
export function CreatorCollaborationsPage(): JSX.Element {
  const [bookings, setBookings] = useState<CreatorCollaboration[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    api
      .listBookingsReceived({ pageSize: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return;
        setBookings(page.items);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function respond(
    id: string,
    next: Extract<BookingStatus, "ACCEPTED" | "DECLINED">,
  ): Promise<void> {
    setRespondingId(id);
    try {
      await api.updateBookingStatus(id, next);
      // Re-fetch rather than patch the row in place: `updateBookingStatus`
      // returns a bare Booking, and a status change also changes the row's
      // derived nextAction (respond -> publish, say) — only the list
      // endpoint recomputes that.
      const page = await api.listBookingsReceived({ pageSize: PAGE_SIZE });
      setBookings(page.items);
    } catch {
      // Leave the row as it was; the buttons re-enable so they can try again.
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-s6">
      <div className="flex flex-col gap-s1">
        <h1 className="text-page-title text-text">Collaborations</h1>
        <p className="text-body text-text-muted">
          Where each one stands, what to do next, and what happens if you
          leave it alone.
        </p>
      </div>

      {status === "loading" && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          Loading your collaborations…
        </div>
      )}
      {status === "error" && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          Could not load your collaborations. Reload the page to try again.
        </div>
      )}
      {status === "ready" && bookings.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          No collaborations yet. Brands will reach out here when they want to
          work with you.
        </div>
      )}
      {status === "ready" && bookings.length > 0 && (
        <ul className="flex flex-col gap-s3">
          {orderByNextAction(bookings).map((booking) => (
            <CollaborationCard
              key={booking.id}
              booking={booking}
              responding={respondingId === booking.id}
              onRespond={(id, next) => void respond(id, next)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

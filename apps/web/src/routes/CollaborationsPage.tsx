import { useEffect, useState } from "react";
import type { BookingSent, BookingStatus } from "@naano/shared";
import { api } from "../lib/api";
import { CollaborationsTable } from "../components/campaign/CollaborationsTable";
import { CreatorsPagination } from "../components/marketplace/CreatorsPagination";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { bookingStatusLabel } from "../lib/bookingStatus";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: BookingStatus[] = [
  "INVITED",
  "ACCEPTED",
  "DECLINED",
  "DRAFT_READY",
  "SCHEDULED",
  "LIVE",
  "PAID",
];

// Every booking the signed-in brand has made, across every campaign. GET
// /bookings/sent is already paginated; the status filter is a real ?status=
// param, not a client-side slice, so it stays correct past one page.
export function CollaborationsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [bookings, setBookings] = useState<BookingSent[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    api
      .listBookingsSent({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter || undefined,
      })
      .then((result) => {
        if (cancelled) return;
        setBookings(result.items);
        setTotal(result.total);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, reloadKey]);

  function changeStatus(value: string): void {
    setStatusFilter(value as BookingStatus | "");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-s6">
      <div className="flex flex-col gap-s1">
        <h1 className="text-page-title text-text">Collaborations</h1>
        <p className="text-body text-text-muted">
          Every booking your company has made, across every campaign.
        </p>
      </div>

      <div className="w-56">
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => changeStatus(e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            ...STATUS_OPTIONS.map((s) => ({ value: s, label: bookingStatusLabel(s) })),
          ]}
        />
      </div>

      {status === "loading" && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          Loading collaborations…
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-start gap-s3 rounded-card border border-border bg-surface p-s8">
          <div className="flex flex-col gap-s1">
            <p className="text-card-title text-text">
              Collaborations didn&rsquo;t load
            </p>
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

      {status === "ready" && bookings.length === 0 && (
        <div className="rounded-card border border-border bg-surface p-s8 text-body text-text-muted">
          {statusFilter
            ? `No ${bookingStatusLabel(statusFilter).toLowerCase()} collaborations.`
            : "No collaborations yet. Book a creator from the Marketplace to get started."}
        </div>
      )}

      {status === "ready" && bookings.length > 0 && (
        <>
          <CollaborationsTable bookings={bookings} />
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

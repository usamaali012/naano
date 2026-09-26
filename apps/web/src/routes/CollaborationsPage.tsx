import { useEffect, useState } from "react";
import type { BookingStatus, BrandCollaboration } from "@naano/shared";
import { api } from "../lib/api";
import { useActionCountStore } from "../lib/stores/actionCountStore";
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

// Consequence is non-empty exactly when the next move is the brand's — same
// ordering rule as the creator's Collaborations screen, so the pattern reads
// as one system. Stable sort keeps each group in the server's own
// createdAt-desc order.
function orderByNextAction(bookings: BrandCollaboration[]): BrandCollaboration[] {
  return [...bookings].sort((a, b) => {
    const aActionable = a.nextAction.consequence !== "" ? 0 : 1;
    const bActionable = b.nextAction.consequence !== "" ? 0 : 1;
    return aActionable - bActionable;
  });
}

// Every booking the signed-in brand has made, across every campaign. GET
// /bookings/sent is already paginated; the status filter is a real ?status=
// param, not a client-side slice, so it stays correct past one page.
export function CollaborationsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [bookings, setBookings] = useState<BrandCollaboration[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const refreshActionCount = useActionCountStore((state) => state.refresh);

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
        setErrors({});
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

  function clearError(id: string): void {
    setErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function fail(id: string, err: unknown): void {
    const message = err instanceof Error ? err.message : "Something went wrong. Try again.";
    setErrors((prev) => ({ ...prev, [id]: message }));
  }

  function replaceRow(row: BrandCollaboration): void {
    setBookings((prev) => prev.map((b) => (b.id === row.id ? row : b)));
  }

  async function run(id: string, action: (id: string) => Promise<BrandCollaboration>): Promise<void> {
    setBusyId(id);
    clearError(id);
    try {
      const updated = await action(id);
      replaceRow(updated);
      void refreshActionCount();
    } catch (err) {
      fail(id, err);
    } finally {
      setBusyId(null);
    }
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
          <CollaborationsTable
            bookings={orderByNextAction(bookings)}
            busyId={busyId}
            errors={errors}
            onApprove={(id) => void run(id, api.approveDraft)}
            onRequestChanges={(id) => void run(id, api.requestChanges)}
            onMarkPaid={(id) => void run(id, api.markPaid)}
          />
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

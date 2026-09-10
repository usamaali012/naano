import { useEffect, useState } from "react";
import type { Booking, CreatorProfileDetail } from "@naano/shared";
import { cpmCents } from "@naano/shared";
import { Disclosure } from "../../ui/Disclosure";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { StatusPill } from "../../ui/StatusPill";
import { api } from "../../../lib/api";
import { ApiError } from "../../../lib/api/errors";
import { useBookingsStore } from "../../../lib/stores/bookingsStore";
import { bookingStatusLabel, bookingStatusTone } from "../../../lib/bookingStatus";
import { formatCents, formatCompactNumber } from "../../../lib/format";

const BOOKING_STEPS = [
  "You send a booking request with the brief.",
  "The creator reviews it and accepts or declines.",
  "Once accepted, you and the creator coordinate the post and payment directly.",
];

interface BookingRailProps {
  creator: CreatorProfileDetail;
}

type Package = "single" | "bundle";
type Phase = "idle" | "submitting" | "booked" | "error" | "conflict";

function defaultDeliverable(pkg: Package): string {
  return pkg === "bundle"
    ? "5 sponsored LinkedIn posts with tracked CTA links"
    : "1 sponsored LinkedIn post with tracked CTA link";
}

// The booking summary, plus the real submit control. On success the rail
// shows the created booking's state instead of resetting to a blank form.
export function BookingRail({ creator }: BookingRailProps): JSX.Element {
  const [pkg, setPkg] = useState<Package>("single");
  const [deliverable, setDeliverable] = useState(() => defaultDeliverable("single"));
  const [deliverableTouched, setDeliverableTouched] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const recordBooking = useBookingsStore((state) => state.recordBooking);

  // A fresh creator (new modal open) always starts from a blank rail.
  useEffect(() => {
    setPkg("single");
    setDeliverable(defaultDeliverable("single"));
    setDeliverableTouched(false);
    setPhase("idle");
    setBooking(null);
    setErrorMessage("");
  }, [creator.id]);

  function selectPackage(next: Package): void {
    setPkg(next);
    if (!deliverableTouched) setDeliverable(defaultDeliverable(next));
  }

  const firstName = creator.displayName.split(" ")[0] ?? creator.displayName;

  const isBundle = pkg === "bundle";
  const packageCents = isBundle
    ? creator.bundle5PriceCents
    : creator.postCostCents;
  // CPM is always per single post, so the bundle divides its price by five.
  const perPostCents = isBundle
    ? Math.round(creator.bundle5PriceCents / 5)
    : creator.postCostCents;
  const cpm = cpmCents(perPostCents, creator.medianViews);

  const options: Array<{ id: Package; label: string; priceCents: number }> = [
    { id: "single", label: "Single post", priceCents: creator.postCostCents },
    { id: "bundle", label: "Bundle of 5", priceCents: creator.bundle5PriceCents },
  ];

  async function submit(): Promise<void> {
    setPhase("submitting");
    try {
      const created = await api.createBooking({
        creatorProfileId: creator.id,
        package: pkg,
        deliverable,
      });
      recordBooking(creator.id, created.status);
      setBooking(created);
      setPhase("booked");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setPhase("conflict");
        return;
      }
      setErrorMessage("Couldn't send this booking. Try again.");
      setPhase("error");
    }
  }

  return (
    <div className="flex flex-col gap-s4">
      <h3 className="text-card-title text-text">Book this creator</h3>

      {phase === "booked" && booking ? (
        <div className="flex flex-col gap-s3 rounded-control border border-border p-s3">
          <StatusPill
            tone={bookingStatusTone(booking.status)}
            label={bookingStatusLabel(booking.status)}
          />
          <p className="text-body text-text">
            Booking sent to {firstName}. They&rsquo;ll accept or decline from
            their side.
          </p>
          <dl className="flex flex-col gap-s2 border-t border-border pt-s3 text-body">
            <div className="flex items-center justify-between">
              <dt className="text-text-muted">Agreed price</dt>
              <dd className="tabular-nums text-text">
                {formatCents(booking.agreedPriceCents)}
              </dd>
            </div>
            <div className="flex flex-col gap-s1">
              <dt className="text-text-muted">Deliverable</dt>
              <dd className="text-text">{booking.deliverable}</dd>
            </div>
          </dl>
        </div>
      ) : phase === "conflict" ? (
        <div className="flex flex-col gap-s2 rounded-control border border-border p-s3">
          <StatusPill tone="neutral" label="Already booked" />
          <p className="text-body text-text">
            {firstName} is already booked for this campaign.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-s2">
            {options.map((option) => {
              const active = option.id === pkg;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  disabled={phase === "submitting"}
                  onClick={() => selectPackage(option.id)}
                  className={`flex items-center justify-between rounded-control border px-s3 py-s3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-primary"
                  }`}
                >
                  <span className="flex items-center gap-s2 text-body text-text">
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        active ? "border-primary" : "border-border"
                      }`}
                    >
                      {active && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </span>
                    {option.label}
                  </span>
                  <span className="tabular-nums text-body font-medium text-text">
                    {formatCents(option.priceCents)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-s2">
            <label htmlFor="booking-deliverable" className="text-label text-text-muted">
              Deliverable
            </label>
            <Input
              id="booking-deliverable"
              value={deliverable}
              disabled={phase === "submitting"}
              onChange={(e) => {
                setDeliverableTouched(true);
                setDeliverable(e.target.value);
              }}
            />
          </div>
        </>
      )}

      <dl className="flex flex-col gap-s2 border-t border-border pt-s4 text-body">
        <div className="flex items-center justify-between">
          <dt className="text-text-muted">Selected</dt>
          <dd className="tabular-nums text-text">
            {formatCents(packageCents)}{" "}
            <span className="text-text-muted">
              ({isBundle ? "5 posts" : "1 post"})
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-text-muted">Typical reach</dt>
          <dd className="tabular-nums text-text">
            {formatCompactNumber(creator.medianViews)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-text-muted">Estimated CPM</dt>
          <dd className="tabular-nums text-text">
            {cpm > 0 ? formatCents(cpm) : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-text-muted">Posts analysed</dt>
          <dd className="tabular-nums text-text">{creator.postsAnalyzed}</dd>
        </div>
      </dl>

      {cpm > 0 && (
        <div className="border-t border-border pt-s4">
          <Disclosure
            summary={
              <span className="text-body font-medium text-text">
                How pricing is calculated
              </span>
            }
          >
            <div className="flex flex-col gap-s2 tabular-nums text-body text-text-muted">
              {isBundle && (
                <p>
                  Bundle of 5 is {formatCents(packageCents)}, so{" "}
                  {formatCents(packageCents)} ÷ 5 = {formatCents(perPostCents)}{" "}
                  per post.
                </p>
              )}
              <p>
                {formatCents(perPostCents)} per post ÷{" "}
                {formatCompactNumber(creator.medianViews)} median views × 1,000 ={" "}
                {formatCents(cpm)} per 1,000 views.
              </p>
            </div>
          </Disclosure>
        </div>
      )}

      <div className="flex flex-col gap-s2 border-t border-border pt-s4">
        <span className="text-label text-text-muted">How booking works</span>
        <ol className="flex flex-col gap-s2">
          {BOOKING_STEPS.map((step, i) => (
            <li key={i} className="flex gap-s2 text-label text-text-muted">
              <span className="tabular-nums text-text">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {phase === "error" && (
        <p className="text-label text-warn">{errorMessage}</p>
      )}

      {phase !== "booked" && phase !== "conflict" && (
        <>
          <Button
            onClick={() => void submit()}
            disabled={phase === "submitting" || deliverable.trim() === ""}
            className="w-full"
          >
            {phase === "submitting"
              ? "Sending…"
              : phase === "error"
                ? "Try again"
                : `Collaborate with ${firstName}`}
          </Button>
          <p className="text-label text-text-muted">
            Secure booking. The creator approves before anything is charged.
          </p>
        </>
      )}
    </div>
  );
}

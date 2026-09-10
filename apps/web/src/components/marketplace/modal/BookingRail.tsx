import { useState } from "react";
import type { CreatorProfileDetail } from "@naano/shared";
import { cpmCents } from "@naano/shared";
import { Disclosure } from "../../ui/Disclosure";
import { formatCents, formatCompactNumber } from "../../../lib/format";

const BOOKING_STEPS = [
  "You send a booking request with the brief.",
  "The creator reviews it and accepts or passes.",
  "On accept, the post goes live with a tracked link and payment is released.",
];

interface BookingRailProps {
  creator: CreatorProfileDetail;
}

type Package = "single" | "bundle";

// The booking summary. Package selection is real local state and drives the
// estimated CPM; the "Collaborate with <name>" CTA and the Booking write land
// with slice 2.13.
export function BookingRail({ creator }: BookingRailProps): JSX.Element {
  const [pkg, setPkg] = useState<Package>("single");

  const perPostCents =
    pkg === "single"
      ? creator.postCostCents
      : Math.round(creator.bundle5PriceCents / 5);
  const cpm = cpmCents(perPostCents, creator.medianViews);

  const options: Array<{ id: Package; label: string; priceCents: number }> = [
    { id: "single", label: "Single post", priceCents: creator.postCostCents },
    { id: "bundle", label: "Bundle of 5", priceCents: creator.bundle5PriceCents },
  ];

  return (
    <div className="flex flex-col gap-s4">
      <h3 className="text-card-title text-text">Book this creator</h3>

      <div className="flex flex-col gap-s2">
        {options.map((option) => {
          const active = option.id === pkg;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setPkg(option.id)}
              className={`flex items-center justify-between rounded-control border px-s3 py-s3 text-left transition-colors ${
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

      <dl className="flex flex-col gap-s2 border-t border-border pt-s4 text-body">
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
            <p className="tabular-nums text-body text-text-muted">
              {formatCents(perPostCents)} ÷{" "}
              {formatCompactNumber(creator.medianViews)} median views × 1,000 ={" "}
              {formatCents(cpm)} per 1,000 views.
            </p>
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

      <p className="text-label text-text-muted">
        Secure booking. The creator approves before anything is charged.
      </p>
    </div>
  );
}

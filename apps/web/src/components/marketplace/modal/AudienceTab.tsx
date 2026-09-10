import type { AudienceDimension, CreatorProfileDetail } from "@naano/shared";
import { SegmentedBar } from "../../ui/SegmentedBar";
import { Disclosure } from "../../ui/Disclosure";
import { segmentsFor } from "./audienceSegments";

interface AudienceTabProps {
  creator: CreatorProfileDetail;
}

const DIMENSIONS: Array<{ key: AudienceDimension; label: string }> = [
  { key: "JOB_TITLE", label: "Job title" },
  { key: "SENIORITY", label: "Seniority" },
  { key: "INDUSTRY", label: "Industry" },
  { key: "GEOGRAPHY", label: "Audience geography" },
];

export function AudienceTab({ creator }: AudienceTabProps): JSX.Element {
  return (
    <div className="flex flex-col gap-s4">
      <div className="flex flex-wrap items-start justify-between gap-s2">
        <div className="flex flex-col gap-s1">
          <h3 className="text-card-title text-text">Audience composition</h3>
          <p className="text-body text-text-muted">
            Top segments by dimension. Each bar compares like with like.
          </p>
        </div>
        <div className="flex flex-col items-end text-label text-text-muted">
          <span>
            Estimated from {creator.observedEngagerCount} recent public engagers
          </span>
          <span>Observed engaged profiles: {creator.observedEngagerCount}</span>
        </div>
      </div>

      <div className="grid gap-s4 sm:grid-cols-2">
        {DIMENSIONS.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col gap-s3 rounded-card border border-border p-s4"
          >
            <span className="text-label text-text-muted">{label}</span>
            <SegmentedBar segments={segmentsFor(creator, key)} />
          </div>
        ))}
      </div>

      <div className="rounded-card border border-border p-s4">
        <Disclosure
          summary={
            <span className="text-body font-medium text-text">
              See the full audience: {creator.observedEngagerCount} signals
            </span>
          }
        >
          <p className="text-body text-text-muted">
            These segments are estimated from {creator.observedEngagerCount}{" "}
            public profiles that engaged with{" "}
            {creator.displayName.split(" ")[0]}&rsquo;s last{" "}
            {creator.postsAnalyzed} posts. Each dimension is scored
            independently, so its four segments sum to 100%.
          </p>
        </Disclosure>
      </div>
    </div>
  );
}

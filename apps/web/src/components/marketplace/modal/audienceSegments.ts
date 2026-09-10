import type { AudienceDimension, CreatorProfileDetail } from "@naano/shared";

export interface Segment {
  label: string;
  percentage: number;
}

/** The four segments for one audience dimension, largest first. */
export function segmentsFor(
  detail: CreatorProfileDetail,
  dimension: AudienceDimension,
): Segment[] {
  return detail.audienceSegments
    .filter((segment) => segment.dimension === dimension)
    .sort((a, b) => b.percentage - a.percentage)
    .map((segment) => ({ label: segment.label, percentage: segment.percentage }));
}

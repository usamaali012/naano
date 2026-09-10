import type { Vertical } from "@naano/shared";

// Audience fit is a relationship between a creator and a specific campaign's
// target buyer, not an intrinsic property of the creator. It is computed on
// demand here rather than stored.
//
// This is the single place the scoring rule lives. Callers go through
// `CreatorsService.audienceFitScore(...)` and never see the formula, so the
// rule below can be swapped (ML model, richer campaign targeting, engagement
// weighting) without touching them.

export interface AudienceFitCreator {
  vertical: Vertical;
  followerCount: number;
}

// Campaigns do not yet carry an explicit target buyer in the schema (the
// campaign flow is still a stub). The scorer only needs the target vertical,
// so it takes just that; when Campaign grows a `targetVertical` column this
// shape already lines up with it.
export interface AudienceFitCampaign {
  targetVertical: Vertical;
}

const VERTICAL_WEIGHT = 0.7;
const FOLLOWER_TIER_WEIGHT = 0.3;

// Cross-vertical relevance is not zero, but an exact match dominates.
const EXACT_VERTICAL_MATCH = 1;
const CROSS_VERTICAL_MATCH = 0.15;

function followerTierComponent(followerCount: number): number {
  if (followerCount < 10_000) return 0.4;
  if (followerCount < 50_000) return 0.7;
  if (followerCount < 150_000) return 0.9;
  return 1;
}

/**
 * Deterministic audience-fit score in the range 0..100 for a
 * (creator, campaign) pair. Higher is a better fit.
 */
export function scoreAudienceFit(
  creator: AudienceFitCreator,
  campaign: AudienceFitCampaign,
): number {
  const verticalComponent =
    creator.vertical === campaign.targetVertical
      ? EXACT_VERTICAL_MATCH
      : CROSS_VERTICAL_MATCH;

  const raw =
    VERTICAL_WEIGHT * verticalComponent +
    FOLLOWER_TIER_WEIGHT * followerTierComponent(creator.followerCount);

  return Math.round(raw * 100);
}

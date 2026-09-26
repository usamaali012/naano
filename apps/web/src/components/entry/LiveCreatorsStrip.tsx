import { useEffect, useState } from "react";
import type { MarketplaceCreator } from "@naano/shared";
import { api } from "../../lib/api";
import { formatCompactNumber, verticalLabel } from "../../lib/format";
import { Avatar } from "../ui/Avatar";

// Real GET /creators, unauthenticated (the route is public — see
// apps/api/src/creators/creators.controller.ts). `creators` stays `null`
// while the request is in flight; a failed or empty request resolves it to
// `[]`, which renders nothing — the strip hides silently rather than showing
// an error on a page whose only job is to get someone signed in.
export function LiveCreatorsStrip(): JSX.Element | null {
  const [creators, setCreators] = useState<MarketplaceCreator[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listCreators({ page: 1, pageSize: 5 })
      .then((result) => {
        if (!cancelled) setCreators(result.items);
      })
      .catch(() => {
        if (!cancelled) setCreators([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!creators || creators.length === 0) return null;

  return (
    <div className="flex flex-col gap-s4">
      <span className="text-label text-text-muted">Creators in the marketplace</span>
      <div className="flex flex-wrap gap-s4">
        {creators.map((creator) => (
          <div
            key={creator.id}
            className="flex items-center gap-s3 rounded-card border border-border bg-surface p-s3"
          >
            <Avatar src={creator.avatarUrl} name={creator.displayName} className="h-10 w-10" />
            <div className="flex flex-col">
              <span className="text-card-title text-text">{creator.displayName}</span>
              <span className="text-label text-text-muted">
                {verticalLabel(creator.vertical)}, {formatCompactNumber(creator.followerCount)} followers
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

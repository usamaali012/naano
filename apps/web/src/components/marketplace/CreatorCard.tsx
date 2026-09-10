import type { CreatorProfile } from "@naano/shared";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { formatCents, formatCompactNumber } from "../../lib/format";

interface CreatorCardProps {
  creator: CreatorProfile;
}

export function CreatorCard({ creator }: CreatorCardProps): JSX.Element {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{creator.displayName}</h3>
          <p className="text-sm text-slate-500">{creator.headline}</p>
        </div>
        <Badge>{creator.vertical.replace(/_/g, " ")}</Badge>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>{formatCompactNumber(creator.followerCount)} followers</span>
        <span>{creator.country}</span>
        <span>{(creator.engagementRate * 100).toFixed(1)}% engagement</span>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-500">per post</span>
        <span className="text-lg font-semibold text-slate-900">{formatCents(creator.postCostCents)}</span>
      </div>
    </Card>
  );
}

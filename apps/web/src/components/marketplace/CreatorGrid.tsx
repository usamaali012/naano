import type { CreatorProfile } from "@naano/shared";
import { CreatorCard } from "./CreatorCard";

interface CreatorGridProps {
  creators: CreatorProfile[];
}

export function CreatorGrid({ creators }: CreatorGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {creators.map((creator) => (
        <CreatorCard key={creator.id} creator={creator} />
      ))}
    </div>
  );
}

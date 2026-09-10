import type { BookingStatus, MarketplaceCreator } from "@naano/shared";
import { CreatorCard } from "./CreatorCard";

interface CreatorGridProps {
  creators: MarketplaceCreator[];
  selectedIds: Set<string>;
  shortlistIds: Set<string>;
  bookingStatusById: Record<string, BookingStatus>;
  onToggleSelect: (id: string) => void;
  onToggleShortlist: (id: string) => void;
  onOpen: (id: string) => void;
}

// 3 columns at desktop, 2 at tablet, 1 at mobile (docs/DESIGN.md §layout).
export function CreatorGrid({
  creators,
  selectedIds,
  shortlistIds,
  bookingStatusById,
  onToggleSelect,
  onToggleShortlist,
  onOpen,
}: CreatorGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-s4 sm:grid-cols-2 lg:grid-cols-3">
      {creators.map((creator) => (
        <CreatorCard
          key={creator.id}
          creator={creator}
          selected={selectedIds.has(creator.id)}
          onToggleSelect={onToggleSelect}
          shortlisted={shortlistIds.has(creator.id)}
          onToggleShortlist={onToggleShortlist}
          onOpen={onOpen}
          bookingStatus={bookingStatusById[creator.id]}
        />
      ))}
    </div>
  );
}

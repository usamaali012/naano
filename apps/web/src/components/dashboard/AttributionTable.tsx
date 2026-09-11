import type { AttributionRow } from "@naano/shared";
import { Table, THead, TBody, TR, TH, TD } from "../ui/Table";
import { formatRelativeTime } from "../../lib/format";

interface AttributionTableProps {
  rows: AttributionRow[];
}

// Creator, accepted bookings, total clicks, last click — no ranking language,
// no badges. See docs/DECISIONS.md for why lastClickAt replaced a second
// clicks-derived metric.
export function AttributionTable({ rows }: AttributionTableProps): JSX.Element {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Creator</TH>
          <TH className="text-right">Accepted bookings</TH>
          <TH className="text-right">Clicks</TH>
          <TH>Last click</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.creatorProfileId}>
            <TD className="font-medium text-text">{row.creatorDisplayName}</TD>
            <TD className="text-right tabular-nums">{row.acceptedBookingsCount}</TD>
            <TD className="text-right tabular-nums">{row.totalClicks}</TD>
            <TD className="text-text-muted">
              {row.lastClickAt ? formatRelativeTime(row.lastClickAt) : "—"}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

// No campaignId, no date range — 5.4 is scoped to lifetime attribution per
// creator for the signed-in brand. See docs/DECISIONS.md.
export class ListAttributionDto extends PaginationQueryDto {}

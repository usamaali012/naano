import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

// Only pagination for now. No vertical/country filter yet — those wait for the
// brief. Until then `?vertical=FINTECH` is an unknown param and 400s rather
// than silently returning mixed verticals.
export class ListCreatorsDto extends PaginationQueryDto {}

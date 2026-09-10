import type { CreatorProfile, PageParams, Paginated } from "@naano/shared";

export interface ApiClient {
  listCreators(params?: PageParams): Promise<Paginated<CreatorProfile>>;
}

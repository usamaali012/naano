import type {
  CreatorProfileDetail,
  ListCreatorsParams,
  MarketplaceCreator,
  Paginated,
} from "@naano/shared";

export interface ApiClient {
  listCreators(params?: ListCreatorsParams): Promise<Paginated<MarketplaceCreator>>;
  getCreator(id: string): Promise<CreatorProfileDetail>;
}

import type {
  CampaignSummary,
  CreatorProfileDetail,
  ListCreatorsParams,
  MarketplaceCreator,
  PageParams,
  Paginated,
} from "@naano/shared";

export interface ApiClient {
  listCreators(params?: ListCreatorsParams): Promise<Paginated<MarketplaceCreator>>;
  getCreator(id: string): Promise<CreatorProfileDetail>;

  /** The campaign the marketplace is ranked for and the shortlist is keyed to. */
  getActiveCampaign(): Promise<CampaignSummary>;

  listShortlist(
    campaignId: string,
    params?: PageParams,
  ): Promise<Paginated<MarketplaceCreator>>;
  addToShortlist(
    campaignId: string,
    creatorProfileId: string,
  ): Promise<MarketplaceCreator>;
  removeFromShortlist(campaignId: string, creatorProfileId: string): Promise<void>;
}

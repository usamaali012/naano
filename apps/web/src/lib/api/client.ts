import type {
  AuthMe,
  CampaignSummary,
  CreatorProfileDetail,
  ListCreatorsParams,
  LoginResponse,
  MarketplaceCreator,
  PageParams,
  Paginated,
} from "@naano/shared";

export interface ApiClient {
  /** Real login. Returns the JWT; the caller stores it and calls getMe. */
  login(email: string, password: string): Promise<LoginResponse>;
  /** The signed-in user — requires the token to have been set. */
  getMe(): Promise<AuthMe>;

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

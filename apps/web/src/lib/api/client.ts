import type {
  AuthMe,
  Booking,
  BookingReceived,
  CampaignSummary,
  CreateBookingBody,
  CreatorProfileDetail,
  DemoCreatorResponse,
  ListCreatorsParams,
  LoginResponse,
  MarketplaceCreator,
  PageParams,
  Paginated,
  UpdateBookingStatusBody,
} from "@naano/shared";

export interface ApiClient {
  /** Real login. Returns the JWT; the caller stores it and calls getMe. */
  login(email: string, password: string): Promise<LoginResponse>;
  /** The signed-in user — requires the token to have been set. */
  getMe(): Promise<AuthMe>;
  /** Public. Which seeded creator EntryPage's "Continue as a creator" signs into. */
  getDemoCreatorEmail(): Promise<DemoCreatorResponse>;

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

  /** Brand-only. Creates a Booking from the signed-in company's active campaign. */
  createBooking(body: CreateBookingBody): Promise<Booking>;
  /** Creator-only. Bookings addressed to the signed-in creator's own profile. */
  listBookingsReceived(params?: PageParams): Promise<Paginated<BookingReceived>>;
  /** Brand-only. Bookings the signed-in company has made, optionally by campaign. */
  listBookingsSent(
    params?: PageParams & { campaignId?: string },
  ): Promise<Paginated<Booking>>;
  /** Creator-only. Accept or decline a booking addressed to them. */
  updateBookingStatus(
    id: string,
    status: UpdateBookingStatusBody["status"],
  ): Promise<Booking>;
}

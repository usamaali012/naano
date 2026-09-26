import type {
  ActionCount,
  AttributionResponse,
  AuthMe,
  Booking,
  BookingStatus,
  BrandCollaboration,
  CampaignOverview,
  CampaignSummary,
  CreateBookingBody,
  CreatorCollaboration,
  CreatorEarnings,
  CreatorProfileDetail,
  DemoCreatorResponse,
  ListCreatorsParams,
  LoginResponse,
  MarketplaceCreator,
  PageParams,
  Paginated,
  ResultsOverview,
  UpdateBookingStatusBody,
  UpdateMyCardBody,
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
  /**
   * Creator-only. Edit the signed-in creator's own headline/prices — every
   * field optional, at least one required. Returns the updated
   * CreatorProfileDetail. Existing bookings keep their agreedPriceCents; a
   * new price only affects bookings made after it.
   */
  updateMyCard(body: UpdateMyCardBody): Promise<CreatorProfileDetail>;

  /** The campaign the marketplace is ranked for and the shortlist is keyed to. */
  getActiveCampaign(): Promise<CampaignSummary>;
  /** Brand-only. The signed-in company's own campaigns, with money against budget. */
  listCampaigns(params?: PageParams): Promise<Paginated<CampaignOverview>>;

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
  /**
   * Creator-only. Bookings addressed to the signed-in creator's own profile.
   * Each row carries a derived `nextAction` (what to do, what happens if they
   * don't) and `netCents` (their share after commission) — the organising
   * facts of the creator's Collaborations screen.
   */
  listBookingsReceived(params?: PageParams): Promise<Paginated<CreatorCollaboration>>;
  /**
   * Creator-only. Their own money in one response: total earned and average
   * per deal (PAID, net of commission), what's in transit (accepted through
   * live), and six months of net earnings, oldest first. No "available to
   * withdraw" — payment rails are cut.
   */
  getEarnings(): Promise<CreatorEarnings>;
  /**
   * Brand-only. Bookings the signed-in company has made, optionally by
   * campaign and/or status — backs the Collaborations table. Rows carry
   * creator/campaign names, the derived package, and the brand's own
   * nextAction/draftContent/postUrl.
   */
  listBookingsSent(
    params?: PageParams & { campaignId?: string; status?: BookingStatus },
  ): Promise<Paginated<BrandCollaboration>>;
  /** Creator-only. Accept or decline a booking addressed to them. */
  updateBookingStatus(
    id: string,
    status: UpdateBookingStatusBody["status"],
  ): Promise<Booking>;

  /** Creator-only. Send a post draft for the brand to review (or resend one after changes were requested). */
  submitDraft(id: string, content: string): Promise<CreatorCollaboration>;
  /** Creator-only. Mark the approved draft as published with its live post URL. */
  markPublished(id: string, postUrl: string): Promise<CreatorCollaboration>;
  /** Brand-only. Approve a submitted draft, scheduling the creator to publish. */
  approveDraft(id: string): Promise<BrandCollaboration>;
  /** Brand-only. Send a draft back to the creator for revision. */
  requestChanges(id: string): Promise<BrandCollaboration>;
  /** Brand-only. Record that a live post has been paid for. */
  markPaid(id: string): Promise<BrandCollaboration>;

  /**
   * Either role. How many bookings are waiting on the signed-in user right
   * now — backs the Collaborations rail badge.
   */
  getActionCount(): Promise<ActionCount>;

  /**
   * Brand-only. Clicks attributed per creator, across every campaign — only
   * creators with at least one accepted (TrackedLink-bearing) booking are
   * included. Backs the Results attribution table.
   */
  listAttribution(params?: PageParams): Promise<AttributionResponse>;

  /**
   * Brand-only. Real aggregates for the Results dashboard, scoped to the
   * signed-in company's own campaigns: clicks by day, the booking pipeline,
   * and money against agreed spend.
   */
  getResultsOverview(): Promise<ResultsOverview>;
}

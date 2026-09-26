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
import type { ApiClient } from "./client";
import { ApiError } from "./errors";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Bearer token for authenticated calls. The auth store sets it on sign-in /
// rehydrate and clears it on sign-out.
let apiToken: string | null = null;
export function setApiToken(token: string | null): void {
  apiToken = token;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (apiToken) headers.set("authorization", `Bearer ${apiToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    // Nest's ValidationPipe reports field errors as a string array, not a
    // single string (e.g. MarkPublishedDto's postUrl check) — join it so the
    // real validation sentence reaches the UI instead of a generic fallback.
    const bodyMessage: unknown = body?.message;
    const message =
      (typeof bodyMessage === "string" && bodyMessage) ||
      (Array.isArray(bodyMessage) && bodyMessage.every((m) => typeof m === "string") &&
        bodyMessage.join(" ")) ||
      `${path} failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function getJson<T>(path: string): Promise<T> {
  return request<T>(path);
}

function pageQuery(params?: PageParams): string {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  const query = search.toString();
  return query ? `?${query}` : "";
}

// Maps ListCreatorsParams onto the GET /creators query string. `vertical` is
// repeatable; everything else is a single value. Empty and undefined values are
// dropped so the URL only carries real constraints.
function creatorsQuery(params?: ListCreatorsParams): string {
  const search = new URLSearchParams();
  if (!params) return "";
  const {
    page,
    pageSize,
    vertical,
    country,
    q,
    campaignId,
    priceMinCents,
    priceMaxCents,
    maxCpmEur,
    minMedianViews,
    minFollowers,
    maxFollowers,
    minEngagementPct,
    postedWithinDays,
    sort,
  } = params;

  for (const v of vertical ?? []) search.append("vertical", v);

  const single: Array<[string, string | number | undefined]> = [
    ["page", page],
    ["pageSize", pageSize],
    ["country", country],
    ["q", q && q.trim() ? q.trim() : undefined],
    ["campaignId", campaignId],
    ["priceMinCents", priceMinCents],
    ["priceMaxCents", priceMaxCents],
    ["maxCpmEur", maxCpmEur],
    ["minMedianViews", minMedianViews],
    ["minFollowers", minFollowers],
    ["maxFollowers", maxFollowers],
    ["minEngagementPct", minEngagementPct],
    ["postedWithinDays", postedWithinDays],
    ["sort", sort],
  ];
  for (const [key, value] of single) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export const httpClient: ApiClient = {
  login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  },
  getMe(): Promise<AuthMe> {
    return getJson<AuthMe>("/auth/me");
  },
  getDemoCreatorEmail(): Promise<DemoCreatorResponse> {
    return getJson<DemoCreatorResponse>("/auth/demo-creator");
  },
  listCreators(params?: ListCreatorsParams): Promise<Paginated<MarketplaceCreator>> {
    return getJson<Paginated<MarketplaceCreator>>(`/creators${creatorsQuery(params)}`);
  },
  getCreator(id: string): Promise<CreatorProfileDetail> {
    return getJson<CreatorProfileDetail>(`/creators/${encodeURIComponent(id)}`);
  },
  updateMyCard(body: UpdateMyCardBody): Promise<CreatorProfileDetail> {
    return request<CreatorProfileDetail>("/creators/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  },
  getActiveCampaign(): Promise<CampaignSummary> {
    return getJson<CampaignSummary>("/campaigns/active");
  },
  listCampaigns(params?: PageParams): Promise<Paginated<CampaignOverview>> {
    return getJson<Paginated<CampaignOverview>>(`/campaigns${pageQuery(params)}`);
  },
  listShortlist(
    campaignId: string,
    params?: PageParams,
  ): Promise<Paginated<MarketplaceCreator>> {
    return getJson<Paginated<MarketplaceCreator>>(
      `/campaigns/${encodeURIComponent(campaignId)}/shortlist${pageQuery(params)}`,
    );
  },
  addToShortlist(
    campaignId: string,
    creatorProfileId: string,
  ): Promise<MarketplaceCreator> {
    return request<MarketplaceCreator>(
      `/campaigns/${encodeURIComponent(campaignId)}/shortlist`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ creatorProfileId }),
      },
    );
  },
  removeFromShortlist(campaignId: string, creatorProfileId: string): Promise<void> {
    return request<void>(
      `/campaigns/${encodeURIComponent(campaignId)}/shortlist/${encodeURIComponent(
        creatorProfileId,
      )}`,
      { method: "DELETE" },
    );
  },
  createBooking(body: CreateBookingBody): Promise<Booking> {
    return request<Booking>("/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  },
  listBookingsReceived(params?: PageParams): Promise<Paginated<CreatorCollaboration>> {
    return getJson<Paginated<CreatorCollaboration>>(`/bookings/received${pageQuery(params)}`);
  },
  getEarnings(): Promise<CreatorEarnings> {
    return getJson<CreatorEarnings>("/bookings/earnings");
  },
  listBookingsSent(
    params?: PageParams & { campaignId?: string; status?: BookingStatus },
  ): Promise<Paginated<BrandCollaboration>> {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.pageSize) search.set("pageSize", String(params.pageSize));
    if (params?.campaignId) search.set("campaignId", params.campaignId);
    if (params?.status) search.set("status", params.status);
    const query = search.toString();
    return getJson<Paginated<BrandCollaboration>>(`/bookings/sent${query ? `?${query}` : ""}`);
  },
  updateBookingStatus(
    id: string,
    status: UpdateBookingStatusBody["status"],
  ): Promise<Booking> {
    return request<Booking>(`/bookings/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
  submitDraft(id: string, content: string): Promise<CreatorCollaboration> {
    return request<CreatorCollaboration>(`/bookings/${encodeURIComponent(id)}/draft`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
  },
  markPublished(id: string, postUrl: string): Promise<CreatorCollaboration> {
    return request<CreatorCollaboration>(`/bookings/${encodeURIComponent(id)}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postUrl }),
    });
  },
  approveDraft(id: string): Promise<BrandCollaboration> {
    return request<BrandCollaboration>(`/bookings/${encodeURIComponent(id)}/approve`, {
      method: "POST",
    });
  },
  requestChanges(id: string): Promise<BrandCollaboration> {
    return request<BrandCollaboration>(`/bookings/${encodeURIComponent(id)}/request-changes`, {
      method: "POST",
    });
  },
  markPaid(id: string): Promise<BrandCollaboration> {
    return request<BrandCollaboration>(`/bookings/${encodeURIComponent(id)}/mark-paid`, {
      method: "POST",
    });
  },
  getActionCount(): Promise<ActionCount> {
    return getJson<ActionCount>("/bookings/action-count");
  },
  listAttribution(params?: PageParams): Promise<AttributionResponse> {
    return getJson<AttributionResponse>(`/analytics/attribution${pageQuery(params)}`);
  },
  getResultsOverview(): Promise<ResultsOverview> {
    return getJson<ResultsOverview>("/analytics/overview");
  },
};

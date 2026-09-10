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
import type { ApiClient } from "./client";

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
    throw new Error(`${path} failed with status ${response.status}`);
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
  listCreators(params?: ListCreatorsParams): Promise<Paginated<MarketplaceCreator>> {
    return getJson<Paginated<MarketplaceCreator>>(`/creators${creatorsQuery(params)}`);
  },
  getCreator(id: string): Promise<CreatorProfileDetail> {
    return getJson<CreatorProfileDetail>(`/creators/${encodeURIComponent(id)}`);
  },
  getActiveCampaign(): Promise<CampaignSummary> {
    return getJson<CampaignSummary>("/campaigns/active");
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
};

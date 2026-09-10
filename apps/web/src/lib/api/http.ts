import type {
  CreatorProfileDetail,
  ListCreatorsParams,
  MarketplaceCreator,
  Paginated,
} from "@naano/shared";
import type { ApiClient } from "./client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
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
  listCreators(params?: ListCreatorsParams): Promise<Paginated<MarketplaceCreator>> {
    return getJson<Paginated<MarketplaceCreator>>(`/creators${creatorsQuery(params)}`);
  },
  getCreator(id: string): Promise<CreatorProfileDetail> {
    return getJson<CreatorProfileDetail>(`/creators/${encodeURIComponent(id)}`);
  },
};

import type { CreatorProfile, PageParams, Paginated } from "@naano/shared";
import type { ApiClient } from "./client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export const httpClient: ApiClient = {
  listCreators(params?: PageParams): Promise<Paginated<CreatorProfile>> {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.pageSize) search.set("pageSize", String(params.pageSize));
    const query = search.toString();
    return getJson<Paginated<CreatorProfile>>(`/creators${query ? `?${query}` : ""}`);
  },
};

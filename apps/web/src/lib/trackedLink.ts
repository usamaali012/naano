const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

/** The public GET /r/:slug URL for a tracked link, for display and copy. */
export function trackedLinkUrl(slug: string): string {
  return `${API_URL}/r/${slug}`;
}

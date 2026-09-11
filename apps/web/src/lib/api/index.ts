import type { ApiClient } from "./client";
import { httpClient } from "./http";
import { fixturesClient } from "./fixtures";

const mode = import.meta.env.VITE_API_MODE ?? "http";

export const api: ApiClient = mode === "fixtures" ? fixturesClient : httpClient;

// Set the bearer token used for authenticated calls (no-op in fixtures mode).
export { setApiToken } from "./http";
export type { ApiClient } from "./client";

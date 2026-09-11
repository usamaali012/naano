import { randomBytes } from "node:crypto";

/** An unguessable, URL-safe slug for a TrackedLink (72 bits, base64url). */
export function generateTrackedLinkSlug(): string {
  return randomBytes(9).toString("base64url");
}

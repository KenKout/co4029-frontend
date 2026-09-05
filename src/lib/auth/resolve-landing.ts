import { apiFetch } from "@/lib/api/client";

import { landingPathForRoles, DEFAULT_LANDING } from "./landing";

/**
 * Resolve where to send a user who has just authenticated.
 *
 * An explicit destination ALWAYS wins: if the user was deep-linking to a page
 * and got bounced to the login screen, sending them to their role's dashboard
 * instead would silently swallow the thing they asked for. Role-based landing
 * only fills the gap where there is no explicit target.
 *
 * Fetches `/me/roles` directly rather than through the React Query hook because
 * the callers are imperative (an effect that immediately calls
 * `window.location.replace`), so there is no render pass in which a hook could
 * settle.
 *
 * NEVER throws: a failed or slow roles call must not strand someone on the
 * login screen, so any error falls back to the student dashboard, which every
 * authenticated user can see.
 */
export async function resolveLandingPath(
  explicitNext?: string | null,
): Promise<string> {
  if (
    typeof explicitNext === "string" &&
    explicitNext.startsWith("/") &&
    !explicitNext.startsWith("//")
  ) {
    return explicitNext;
  }

  try {
    const roles = await apiFetch<string[]>("/me/roles");
    return landingPathForRoles(roles);
  } catch {
    return DEFAULT_LANDING;
  }
}

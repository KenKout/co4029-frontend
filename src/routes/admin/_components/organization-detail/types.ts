/**
 * Shared types for the admin organization-detail page, extracted from the
 * former 1.1k-line organization-detail.tsx so the tab components, their hooks
 * and the page shell agree on one definition instead of re-declaring the
 * string unions at each call site.
 */

/** Which pane of the detail page is showing. */
export type TabKey =
  | "info"
  | "operations"
  | "domains"
  | "units"
  | "memberships";

/**
 * Which pane of the memberships tab is showing: the roster, the single-user
 * add form, or the paste-many bulk form.
 */
export type MembershipsMode = "list" | "add" | "bulk";

/** Outcome of a bulk membership add, split into the user ids that landed and
 * the ones whose create call threw. */
export interface BulkAddResults {
  ok: string[];
  failed: string[];
}

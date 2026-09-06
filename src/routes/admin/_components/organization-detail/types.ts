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

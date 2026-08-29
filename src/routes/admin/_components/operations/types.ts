/**
 * Operations module tabs (PRD ADM-010).
 *
 * Health, Job Health and Processing were three routes answering overlapping
 * questions with three different job definitions. They are one module now, and
 * the tab lives in the URL so an alert can deep-link straight to the tab that
 * explains it rather than dropping an operator on a landing page.
 */
export type OperationsTab = "services" | "jobs" | "failures";

export const OPERATIONS_TABS: OperationsTab[] = [
  "services",
  "jobs",
  "failures",
];

export const DEFAULT_OPERATIONS_TAB: OperationsTab = "services";

/** Narrow an untrusted `?tab=` value, falling back to the default. */
export function parseOperationsTab(value: unknown): OperationsTab {
  return OPERATIONS_TABS.includes(value as OperationsTab)
    ? (value as OperationsTab)
    : DEFAULT_OPERATIONS_TAB;
}

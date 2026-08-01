/**
 * Pure helpers for the admin AI-costs dashboard.
 */

/**
 * Maps the active i18next language onto the BCP-47 tag used by the `Intl`
 * formatters. Mirrors the expression the dashboard used inline before the
 * split: only Vietnamese gets its own locale, everything else falls back to
 * `en-US`.
 */
export function resolveLocale(
  resolvedLanguage: string | undefined,
  language: string | undefined,
): string {
  return (resolvedLanguage ?? language ?? "en") === "vi" ? "vi-VN" : "en-US";
}

/**
 * Renders a nullable metric through `format`, or the em-dash placeholder when
 * the API omitted it. Mirrors the `x !== undefined && x !== null ? … : "—"`
 * guard each summary stat tile spelled out inline before the split — `??`
 * cannot replace it, because a legitimate `0` must still be formatted.
 */
export function formatOrDash<T>(
  value: T | null | undefined,
  format: (value: T) => string,
): string {
  return value !== undefined && value !== null ? format(value) : "—";
}

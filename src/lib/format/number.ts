import { useMemo } from "react";
import { useAppLocale } from "./date";

/**
 * Central number formatting. Several admin pages each re-derived the locale and
 * hand-rolled `Intl.NumberFormat` for counts / currency / percentages.
 *
 *   - `formatCount(n, locale)` — thousands-grouped integer, em dash for null.
 *   - `formatUsd(n, locale, opts)` — USD currency, em dash for null. Fraction
 *     digits configurable (call sites vary: 0–2 adaptive, fixed 4, etc.).
 *   - `fmtPercent` / `fmtPercentScaled` — the two percentage shapes in use.
 *   - `useFormatCount()` / `useFormatters()` — active-locale hooks.
 *
 * Prefer the hooks in components; the pure forms exist for non-component use.
 */

const EM_DASH = "—";

/** Thousands-grouped integer; em dash for null/undefined. */
export function formatCount(
  n: number | null | undefined,
  locale: string,
): string {
  if (n === undefined || n === null) return EM_DASH;
  return new Intl.NumberFormat(locale).format(n);
}

/** USD currency; em dash for null/undefined. `maximumFractionDigits` defaults
 *  to the adaptive 2-under-10-else-0 shape used by the main stats page. */
export function formatUsd(
  n: number | null | undefined,
  locale: string,
  maximumFractionDigits?: number,
): string {
  if (n === undefined || n === null) return EM_DASH;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maximumFractionDigits ?? (n < 10 ? 2 : 0),
  }).format(n);
}

/**
 * A 0..100 score as a whole-or-1-decimal percent, em dash when null/NaN
 * (e.g. 87 → "87%", 87.5 → "87.5%"). Matches ResultsSummaryCards.
 */
export function fmtPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return EM_DASH;
  }
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}%`;
}

/**
 * A 0..1 ratio as a whole-number percent, em dash when null
 * (e.g. 0.87 → "87%"). Matches StatisticsReport's fmtPercent.
 */
export function fmtPercentScaled(v: number | null | undefined): string {
  if (v === null || v === undefined) return EM_DASH;
  return `${(v * 100).toFixed(0)}%`;
}

/** Active-locale integer count formatter (see `formatCount`). */
export function useFormatCount() {
  const locale = useAppLocale();
  return (n: number | null | undefined) => formatCount(n, locale);
}

/**
 * Active-locale bundle of count + USD formatters, matching the former
 * `useFormatters` in admin/stats. `usd` takes the adaptive fraction-digit
 * default; pass `maximumFractionDigits` to override.
 */
export function useFormatters() {
  const locale = useAppLocale();
  return useMemo(
    () => ({
      count: (n: number | null | undefined) => formatCount(n, locale),
      usd: (n: number | null | undefined, maximumFractionDigits?: number) =>
        formatUsd(n, locale, maximumFractionDigits),
    }),
    [locale],
  );
}

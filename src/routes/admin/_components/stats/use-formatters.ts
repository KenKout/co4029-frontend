import { useTranslation } from "react-i18next";

import { formatElapsedLabel, useAppLocale } from "@/lib/format/date";
import { formatCount, formatUsd } from "@/lib/format/number";

import type { StatsFormatters } from "./types";

/**
 * Locale-bound formatters for the operator dashboard.
 *
 * `pct` is the one that carries a product decision: a null rate renders as the
 * translated "No data", not as an em dash and never as 0%. The backend returns
 * null precisely when the denominator was empty, and the operator needs to
 * read that as "nothing ran in this window", not as "nothing failed"
 * (PRD section 5).
 */
export function useFormatters(): StatsFormatters {
  const locale = useAppLocale();
  const { t } = useTranslation();
  const noData = t("admin.dashboard.no_data");
  return {
    count: (n: number | undefined | null): string => formatCount(n, locale),
    usd: (n: number | undefined | null): string => formatUsd(n, locale),
    pct: (n: number | undefined | null, digits = 0): string =>
      n === undefined || n === null ? noData : `${n.toFixed(digits)}%`,
    seconds: (ms: number | undefined | null): string =>
      ms === undefined || ms === null
        ? noData
        : ms >= 1000
          ? `${(ms / 1000).toFixed(1)}s`
          : `${Math.round(ms)}ms`,
    duration: (seconds: number | undefined | null): string =>
      seconds === undefined || seconds === null
        ? noData
        : formatElapsedLabel(seconds),
  };
}

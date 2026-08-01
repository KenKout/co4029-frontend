import { useAppLocale } from "@/lib/format/date";
import { formatCount, formatUsd } from "@/lib/format/number";

import type { StatsFormatters } from "./types";

export function useFormatters(): StatsFormatters {
  const locale = useAppLocale();
  return {
    count: (n: number | undefined | null): string => formatCount(n, locale),
    usd: (n: number | undefined | null): string => formatUsd(n, locale),
    pct: (n: number | undefined | null, digits = 0): string =>
      n === undefined || n === null ? "—" : `${n.toFixed(digits)}%`,
    seconds: (ms: number | undefined | null): string =>
      ms === undefined || ms === null
        ? "—"
        : ms >= 1000
          ? `${(ms / 1000).toFixed(1)}s`
          : `${Math.round(ms)}ms`,
  };
}

import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ActionTrend {
  deltaPct: number | null;
  /** True when a rising number is bad (failure rates, spend). */
  higherIsWorse?: boolean;
  noBaselineLabel?: string;
}

function isTrendWorse(delta: number | null, higherIsWorse?: boolean): boolean {
  return (
    delta !== null && delta !== 0 && (higherIsWorse ? delta > 0 : delta < 0)
  );
}

function trendIconFor(delta: number | null): LucideIcon {
  return delta === null || delta === 0
    ? Minus
    : delta > 0
      ? TrendingUp
      : TrendingDown;
}

function trendToneClass(delta: number | null, worse: boolean): string {
  return delta === null
    ? "text-text-subtle"
    : worse
      ? "text-red-700"
      : delta === 0
        ? "text-text-muted"
        : "text-emerald-700";
}

function trendText(delta: number | null, noBaselineLabel?: string): string {
  return delta === null
    ? (noBaselineLabel ?? "—")
    : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`;
}

export function ActionTileTrend({ trend }: { trend: ActionTrend }) {
  const trendDelta = trend.deltaPct ?? null;
  const trendWorse = isTrendWorse(trendDelta, trend.higherIsWorse);
  const TrendIcon = trendIconFor(trendDelta);
  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 text-xs font-semibold tabular-nums",
        trendToneClass(trendDelta, trendWorse),
      )}
    >
      <TrendIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
      {trendText(trendDelta, trend.noBaselineLabel)}
    </p>
  );
}

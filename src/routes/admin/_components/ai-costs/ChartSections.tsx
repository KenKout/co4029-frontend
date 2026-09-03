import { useTranslation } from "react-i18next";
import type { AiCostsRange } from "@/lib/api/hooks/admin-costs";
import { daysBetweenInclusive } from "@/routes/admin/_components/stats/date-range";
import type { AiCostsSummary } from "@/lib/api/types";
import { RoleBarChart, StageBarChart } from "./CostBarCharts";
import { TrendAreaChart } from "./TrendAreaChart";
import type { SectionQuery } from "./types";

/**
 * The three summary-derived chart sections. All read the same
 * `useAiCostsSummary` result, so they share this module.
 */

export function TrendSection({
  summary,
  range,
}: {
  summary: SectionQuery<AiCostsSummary>;
  range: AiCostsRange;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-headline font-bold text-text-strong">
        {t("admin.ai_costs.sections.trend")}
      </h2>
      {summary.isLoading ? (
        <div className="h-[280px] bg-surface-muted animate-pulse rounded-lg" />
      ) : (
        <TrendAreaChart
          data={summary.data?.buckets ?? []}
          intraday={daysBetweenInclusive(range.from, range.to) === 1}
        />
      )}
    </section>
  );
}

export function RoleSection({
  summary,
}: {
  summary: SectionQuery<AiCostsSummary>;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-headline font-bold text-text-strong">
        {t("admin.ai_costs.sections.by_role")}
      </h2>
      {summary.isLoading ? (
        <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
      ) : (
        <RoleBarChart data={summary.data?.by_role ?? []} />
      )}
    </section>
  );
}

export function StageSection({
  summary,
}: {
  summary: SectionQuery<AiCostsSummary>;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-headline font-bold text-text-strong">
        {t("admin.ai_costs.sections.by_stage")}
      </h2>
      {summary.isLoading ? (
        <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
      ) : (
        <StageBarChart data={summary.data?.by_stage ?? []} />
      )}
    </section>
  );
}

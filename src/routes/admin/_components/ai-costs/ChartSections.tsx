import { useTranslation } from "react-i18next";
import type { AiCostsPeriod } from "@/lib/api/hooks/admin";
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
  period,
}: {
  summary: SectionQuery<AiCostsSummary>;
  period: AiCostsPeriod;
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
        <TrendAreaChart data={summary.data?.buckets ?? []} period={period} />
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

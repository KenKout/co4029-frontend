import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  CircleDollarSign,
  Clock,
  Cpu,
} from "lucide-react";
import type { AiCostsPeriod } from "@/lib/api/hooks/admin";
import { StatCard } from "@/components/ui/stat-card";
import type { AiCostsSummary } from "@/lib/api/types";
import { SectionErrorBox } from "@/components/ui/section-error-box";
import { formatOrDash } from "./helpers";
import { useFormatters } from "./use-formatters";
import type { SectionQuery } from "./types";

/** Headline spend / token / call totals, plus the failed-spend tile. */
export function SummaryStatsSection({
  summary,
  period,
}: {
  summary: SectionQuery<AiCostsSummary>;
  period: AiCostsPeriod;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();

  if (summary.isError) {
    return <SectionErrorBox messageKey="admin.ai_costs.summary_load_failed" />;
  }

  if (summary.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-surface-muted animate-pulse rounded-xl"
          />
        ))}
      </div>
    );
  }

  const totals = summary.data?.totals;
  const failed = summary.data?.failed;
  const failedCallCount = failed?.call_count ?? 0;
  const failedUsd = failed?.usd ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label={t("admin.ai_costs.stats.total_cost")}
        value={formatOrDash(totals?.usd, (v) => fmt.usd.format(v))}
        icon={CircleDollarSign}
      />
      <StatCard
        label={t("admin.ai_costs.stats.total_tokens")}
        value={formatOrDash(totals?.tokens, (v) => fmt.number.format(v))}
        icon={Cpu}
      />
      <StatCard
        label={t("admin.ai_costs.stats.call_count")}
        value={formatOrDash(totals?.call_count, (v) => fmt.number.format(v))}
        icon={Activity}
      />
      <StatCard
        label={t("admin.ai_costs.stats.period")}
        value={t(`admin.ai_costs.period_short.${period}`)}
        icon={Clock}
      />
      {failedCallCount > 0 ? (
        <StatCard
          label={t("admin.ai_costs.stats.failed_spend")}
          value={fmt.usd.format(failedUsd)}
          sublabel={t("admin.ai_costs.stats.failed_spend_hint", {
            count: failedCallCount,
          })}
          icon={AlertTriangle}
        />
      ) : null}
    </div>
  );
}

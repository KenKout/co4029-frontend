import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  useAiCostsByCategory,
  useAiCostsByModel,
  useAiCostsByPipeline,
  useAiCostsByUser,
  useAiCostsSummary,
  useRecentAiCalls,
  type AiCostsDimension,
  type AiCostsFilters,
  type AiCostsPeriod,
} from "@/lib/api/hooks/admin";
import { usePermissions } from "@/lib/auth/use-permissions";
import { PermissionDenied } from "@/components/ui/permission-denied";
import type { AiCostsByPipeline as AiCostsByPipelineRow } from "@/lib/api/types";
import {
  RoleSection,
  StageSection,
  TrendSection,
} from "./_components/ai-costs/ChartSections";
import { CategorySection } from "./_components/ai-costs/CategorySection";
import { FilterBar } from "./_components/ai-costs/FilterBar";
import { PeriodSelector } from "./_components/ai-costs/PeriodSelector";
import { PipelineDrilldownSheet } from "./_components/ai-costs/PipelineDrilldownSheet";
import { PricingSection } from "./_components/ai-costs/PricingSection";
import { SummaryStatsSection } from "./_components/ai-costs/SummaryStatsSection";
import {
  ModelEfficiencySection,
  RecentCallsSection,
  TopPipelinesSection,
  TopUsersSection,
} from "./_components/ai-costs/TableSections";
import { PERIOD_VALUES } from "./_components/ai-costs/constants";

export default function AdminAiCostsPage() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  // Seed the status filter from ?status= so the admin dashboard's "Failed AI
  // calls" tile deep-links straight to the failures instead of dropping the
  // operator on the unfiltered view, and the period from ?period= so arriving
  // from the dashboard keeps its window. Without that, an operator who set the
  // dashboard to 7d landed here on 30d and compared two different spans of
  // time without being told (PRD ADM-004). The selector stays visible: this is
  // a seeded page-local control, not a mirror of the global filter.
  const search = useSearch({ strict: false }) as {
    status?: string;
    period?: string;
  };
  const [period, setPeriod] = useState<AiCostsPeriod>(() =>
    PERIOD_VALUES.includes(search.period as AiCostsPeriod)
      ? (search.period as AiCostsPeriod)
      : "30d",
  );
  const [dimension, setDimension] = useState<AiCostsDimension>("operation");
  const [filters, setFilters] = useState<AiCostsFilters>({
    model: null,
    role: null,
    operation: null,
    status: search.status ?? null,
  });
  const [drilldown, setDrilldown] = useState<AiCostsByPipelineRow | null>(null);

  const summary = useAiCostsSummary(period, filters);
  const byCategory = useAiCostsByCategory({ period, dimension, filters });
  const byModel = useAiCostsByModel({ period, filters });
  const byUser = useAiCostsByUser({ period, topN: 20 });
  const byPipeline = useAiCostsByPipeline({ period });
  const recent = useRecentAiCalls({ limit: 50 });

  if (permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        <div className="h-6 w-40 bg-surface-muted animate-pulse rounded" />
        <div className="h-32 bg-surface-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!canAdmin) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-headline font-bold text-text-strong">
            {t("admin.ai_costs.title")}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t("admin.ai_costs.subtitle")}
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <FilterBar filters={filters} onChange={setFilters} period={period} />

      <SummaryStatsSection summary={summary} period={period} />

      <TrendSection summary={summary} period={period} />

      <RoleSection summary={summary} />

      <StageSection summary={summary} />

      <CategorySection
        byCategory={byCategory}
        dimension={dimension}
        onDimensionChange={setDimension}
      />

      <TopUsersSection byUser={byUser} />

      <TopPipelinesSection byPipeline={byPipeline} onRowClick={setDrilldown} />

      <ModelEfficiencySection byModel={byModel} />

      <RecentCallsSection recent={recent} />

      <section className="space-y-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.pricing")}
        </h2>
        <PricingSection />
      </section>

      <PipelineDrilldownSheet
        pipeline={drilldown}
        onOpenChange={(open) => {
          if (!open) setDrilldown(null);
        }}
      />
    </div>
  );
}

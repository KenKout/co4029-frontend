import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type {
  AiCostsDimension,
  AiCostsFilters,
  AiCostsRange,
} from "@/lib/api/hooks/admin-costs";
import {
  useAiCostsByCategory,
  useAiCostsByModel,
  useAiCostsByPipeline,
  useAiCostsByUser,
  useAiCostsSummary,
  useRecentAiCalls,
} from "@/lib/api/hooks/admin-costs";
import { usePermissions } from "@/lib/auth/use-permissions";
import { PermissionDenied } from "@/components/ui/permission-denied";
import type { AiCostsByPipeline as AiCostsByPipelineRow } from "@/lib/api/types";
import {
  RoleSection,
  StageSection,
  TrendSection,
} from "./_components/ai-costs/ChartSections";
import { CategorySection } from "./_components/ai-costs/CategorySection";
import { CostDateRange } from "./_components/ai-costs/DateRange";
import { FilterBar } from "./_components/ai-costs/FilterBar";
import { PipelineDrilldownSheet } from "./_components/ai-costs/PipelineDrilldownSheet";
import { PricingSection } from "./_components/ai-costs/PricingSection";
import { SummaryStatsSection } from "./_components/ai-costs/SummaryStatsSection";
import {
  ModelEfficiencySection,
  RecentCallsSection,
  TopPipelinesSection,
  TopUsersSection,
} from "./_components/ai-costs/TableSections";
import { OrganizationSpendTable } from "./_components/ai-costs/OrganizationSpendTable";
import { rangePresets } from "./_components/stats/date-range";

export default function AdminAiCostsPage() {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  // Seed the status filter from ?status= so the admin dashboard's "Failed AI
  // calls" tile deep-links straight to the failures instead of dropping the
  // operator on the unfiltered view, and the window from the ?period= tile
  // links so arriving from the dashboard keeps its span. Without that, an
  // operator who set the dashboard to 7d landed here on 30d and compared two
  // different spans of time without being told (PRD ADM-004).
  const search = useSearch({ strict: false }) as {
    status?: string;
    period?: string;
  };
  const [range, setRange] = useState<AiCostsRange>(() => {
    const presets = rangePresets(new Date());
    switch (search.period) {
      case "24h":
        return presets.today;
      case "7d":
        return presets.last7;
      case "30d":
        return presets.last30;
      default:
        return presets.last30;
    }
  });
  const [dimension, setDimension] = useState<AiCostsDimension>("operation");
  const [filters, setFilters] = useState<AiCostsFilters>({
    model: null,
    role: null,
    operation: null,
    status: search.status ?? null,
  });
  const [drilldown, setDrilldown] = useState<AiCostsByPipelineRow | null>(null);

  // Whether the window matches a named preset the dashboard tiles can link
  // with — surfaced on the trend/stat sections for the window label.
  const summary = useAiCostsSummary(range, filters);
  const byCategory = useAiCostsByCategory({ range, dimension, filters });
  const byModel = useAiCostsByModel({ range, filters });
  const byUser = useAiCostsByUser({ range, topN: 20 });
  const byPipeline = useAiCostsByPipeline({ range });
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
        <CostDateRange value={range} onChange={setRange} />
      </div>

      <FilterBar filters={filters} onChange={setFilters} range={range} />

      <SummaryStatsSection summary={summary} range={range} />

      <TrendSection summary={summary} range={range} />

      <RoleSection summary={summary} />

      <StageSection summary={summary} />

      <CategorySection
        byCategory={byCategory}
        dimension={dimension}
        onDimensionChange={setDimension}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-headline font-bold text-text-strong">
          {t("admin.ai_costs.by_organization")}
        </h2>
        <OrganizationSpendTable range={range} />
      </section>

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

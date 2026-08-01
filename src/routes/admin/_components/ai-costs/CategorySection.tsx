import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import type { AiCostsDimension } from "@/lib/api/hooks/admin";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv-export";
import type { AiCostsByCategory as AiCostsByCategoryRow } from "@/lib/api/types";
import { CategoryBarChart } from "./CostBarCharts";
import { CategoryTable } from "./CategoryTable";
import { DimensionSwitcher } from "./DimensionSwitcher";
import { SectionErrorBox } from "./SectionErrorBox";
import { CATEGORY_CSV_COLUMNS } from "./constants";
import type { SectionQuery } from "./types";

/** Breakdown-by-dimension section: switcher, CSV export, chart and table. */
export function CategorySection({
  byCategory,
  dimension,
  onDimensionChange,
}: {
  byCategory: SectionQuery<AiCostsByCategoryRow[]>;
  dimension: AiCostsDimension;
  onDimensionChange: (next: AiCostsDimension) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-headline font-bold text-text-strong">
          {t("admin.ai_costs.sections.by_category")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <DimensionSwitcher value={dimension} onChange={onDimensionChange} />
          <Button
            variant="ghost"
            size="sm"
            disabled={(byCategory.data ?? []).length === 0}
            onClick={() =>
              downloadCsv(
                "ai-costs-by-" + dimension,
                byCategory.data ?? [],
                CATEGORY_CSV_COLUMNS,
              )
            }
          >
            <Download className="h-4 w-4 mr-1" />
            {t("admin.ai_costs.export_csv")}
          </Button>
        </div>
      </div>
      {byCategory.isError ? (
        <SectionErrorBox messageKey="admin.ai_costs.category_load_failed" />
      ) : byCategory.isLoading ? (
        <div className="h-[300px] bg-surface-muted animate-pulse rounded-lg" />
      ) : (
        <div className="space-y-4">
          <CategoryBarChart data={byCategory.data ?? []} />
          <CategoryTable rows={byCategory.data ?? []} />
        </div>
      )}
    </section>
  );
}

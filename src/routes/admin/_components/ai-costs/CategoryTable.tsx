import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { AiCostsByCategory as AiCostsByCategoryRow } from "@/lib/api/types";
import { useFormatters } from "./use-formatters";

/** Tabular form of the active breakdown dimension, with token split. */
export function CategoryTable({ rows }: { rows: AiCostsByCategoryRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsByCategoryRow>[] = [
    {
      id: "value",
      header: t("admin.ai_costs.cols.category"),
      sortable: true,
      sortValue: (r) => r.dimension_value,
      cell: (r) => (
        <span className="font-medium text-text-strong">
          {r.dimension_value}
        </span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.total_usd,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.total_usd)}
        </span>
      ),
    },
    {
      id: "in",
      header: t("admin.ai_costs.cols.input_tokens"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.input_tokens,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.input_tokens)}
        </span>
      ),
    },
    {
      id: "out",
      header: t("admin.ai_costs.cols.output_tokens"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.output_tokens,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.output_tokens)}
        </span>
      ),
    },
    {
      id: "cached",
      header: t("admin.ai_costs.cols.cached_tokens"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.cached_tokens,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.cached_tokens)}
        </span>
      ),
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.call_count,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.call_count)}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.dimension_value}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.by_category")}
    />
  );
}

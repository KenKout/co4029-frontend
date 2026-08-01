import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { AiCostsByModel as AiCostsByModelRow } from "@/lib/api/types";
import { useFormatters } from "./use-formatters";

/** Per-model cost efficiency: USD per 1M tokens plus latency percentiles. */
export function ModelEfficiencyTable({ rows }: { rows: AiCostsByModelRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsByModelRow>[] = [
    {
      id: "model",
      header: t("admin.ai_costs.cols.model"),
      sortable: true,
      sortValue: (r) => r.model_name,
      cell: (r) => (
        <span className="font-mono text-xs text-text-strong">
          {r.model_name}
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
      id: "per1m",
      header: t("admin.ai_costs.cols.usd_per_1m"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.usd_per_1m_tokens,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.usd_per_1m_tokens)}
        </span>
      ),
    },
    {
      id: "p50",
      header: t("admin.ai_costs.cols.latency_p50"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.latency_p50_ms,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.latency_p50_ms)} ms
        </span>
      ),
    },
    {
      id: "p95",
      header: t("admin.ai_costs.cols.latency_p95"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.latency_p95_ms,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.latency_p95_ms)} ms
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
      getRowId={(r) => r.model_name}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.by_model")}
    />
  );
}

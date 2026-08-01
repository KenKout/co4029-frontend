import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { AiCostsByPipeline as AiCostsByPipelineRow } from "@/lib/api/types";
import { useFormatters } from "./use-formatters";

/** Costliest generation pipeline runs. Rows open the drilldown sheet. */
export function PipelineTable({
  rows,
  onRowClick,
}: {
  rows: AiCostsByPipelineRow[];
  onRowClick: (row: AiCostsByPipelineRow) => void;
}) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsByPipelineRow>[] = [
    {
      id: "pipeline",
      header: t("admin.ai_costs.cols.pipeline"),
      cell: (r) => (
        <span className="font-mono text-xs text-text-strong">
          {r.pipeline_run_id.slice(0, 8)}…
        </span>
      ),
    },
    {
      id: "type",
      header: t("admin.ai_costs.cols.type"),
      sortable: true,
      sortValue: (r) => r.generation_type ?? "",
      cell: (r) => (
        <span className="text-text-muted">{r.generation_type ?? "—"}</span>
      ),
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.call_count ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.call_count ?? 0)}
        </span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.total_tokens ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.total_tokens ?? 0)}
        </span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.total_usd ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.total_usd ?? 0)}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.pipeline_run_id}
      onRowClick={onRowClick}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.pipelines")}
    />
  );
}

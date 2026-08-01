import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { AiCostsRecentCall } from "@/lib/api/types";
import { useFormatters } from "./use-formatters";

/** Raw tail of the AI call log — newest calls first, failures highlighted. */
export function RecentCallsTable({ rows }: { rows: AiCostsRecentCall[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const columns: DataTableColumn<AiCostsRecentCall>[] = [
    {
      id: "time",
      header: t("admin.ai_costs.cols.time"),
      sortable: true,
      sortValue: (r) => (r.created_at ? new Date(r.created_at) : new Date(0)),
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-text-muted">
          {r.created_at ? fmt.datetime.format(new Date(r.created_at)) : "—"}
        </span>
      ),
    },
    {
      id: "model",
      header: t("admin.ai_costs.cols.model"),
      sortable: true,
      sortValue: (r) => r.model ?? "",
      cell: (r) => (
        <span className="font-mono text-xs text-text-strong">
          {r.model ?? "—"}
        </span>
      ),
    },
    {
      id: "role",
      header: t("admin.ai_costs.cols.role"),
      sortable: true,
      sortValue: (r) => r.role ?? "",
      cell: (r) => <span className="text-text-muted">{r.role ?? "—"}</span>,
    },
    {
      id: "stage",
      header: t("admin.ai_costs.cols.stage"),
      cell: (r) => (
        <span className="text-text-muted">{r.stage_name ?? "—"}</span>
      ),
    },
    {
      id: "status",
      header: t("admin.ai_costs.cols.status"),
      cell: (r) => {
        const s = r.status ?? "—";
        const failed = s === "failed";
        return (
          <span
            className={
              failed
                ? "inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
                : "text-text-muted text-xs"
            }
          >
            {s}
          </span>
        );
      },
    },
    {
      id: "latency",
      header: t("admin.ai_costs.cols.latency"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.latency_ms ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {r.latency_ms !== null && r.latency_ms !== undefined
            ? `${fmt.number.format(r.latency_ms)} ms`
            : "—"}
        </span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens_short"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.tokens ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-muted">
          {fmt.number.format(r.tokens ?? 0)}
        </span>
      ),
    },
    {
      id: "cost",
      header: t("admin.ai_costs.cols.cost_short"),
      align: "right",
      sortable: true,
      sortValue: (r) => r.usd ?? 0,
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.usd ?? 0)}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      pagination
      pageSize={15}
      pageSizeOptions={[15, 30, 50]}
      emptyState={t("admin.ai_costs.empty.recent")}
    />
  );
}

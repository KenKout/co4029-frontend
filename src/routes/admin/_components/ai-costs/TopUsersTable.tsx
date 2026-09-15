import { useTranslation } from "react-i18next";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { UserEmailIdentity } from "@/components/ui/user-identity";
import { useUsersByIdMap } from "@/lib/api/hooks/user-identities";
import type { AiCostsByUser as AiCostsByUserRow } from "@/lib/api/types";
import { useFormatters } from "./use-formatters";

/** Highest-spending users for the selected period. */
export function TopUsersTable({ rows }: { rows: AiCostsByUserRow[] }) {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const byId = useUsersByIdMap(rows.map((r) => r.user_id));
  const columns: DataTableColumn<AiCostsByUserRow>[] = [
    {
      id: "user",
      header: t("admin.ai_costs.cols.user"),
      sortable: true,
      sortValue: (r) => r.display_name ?? "",
      cell: (r) => {
        const u = byId.get(r.user_id);
        return (
          <UserEmailIdentity
            id={r.user_id}
            displayName={u?.profile?.display_name || r.display_name || r.user_id}
            avatarUrl={u?.profile?.avatar_url ?? null}
            email={u?.primary_email ?? null}
          />
        );
      },
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
  ];
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.user_id}
      pagination
      pageSize={10}
      pageSizeOptions={[10, 20, 50]}
      emptyState={t("admin.ai_costs.empty.users")}
    />
  );
}

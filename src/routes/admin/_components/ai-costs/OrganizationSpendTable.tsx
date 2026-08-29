import { Building2, Info } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SectionErrorBox } from "@/components/ui/section-error-box";
import type { OrganizationSpendRow } from "@/lib/api/hooks/admin-costs";
import { useAiCostsByOrganization } from "@/lib/api/hooks/admin-costs";

import type { AiCostsPeriod } from "@/lib/api/hooks/admin";

/**
 * Spend per tenant (PRD ADM-040).
 *
 * `ai_model_calls` has no organization column, so this is derived by walking
 * each call's optional parent to a course and from there to a tenant. Calls
 * with no parent — session-runtime work like interview follow-ups — cannot be
 * attributed at all, and they appear as an explicit unattributed row rather
 * than being dropped.
 *
 * The coverage line is not decoration. A breakdown that explains 40% of the
 * bill and does not say so invites chargeback decisions the data cannot
 * support, so the share it can attribute is stated above the table.
 */
export function OrganizationSpendTable({ period }: { period: AiCostsPeriod }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useAiCostsByOrganization(period);

  if (isError) {
    return <SectionErrorBox messageKey="admin.ai_costs.org_load_failed" />;
  }
  if (isLoading || !data) {
    return <PageSkeleton rows={4} bg="bg-surface-muted" />;
  }

  const columns: DataTableColumn<OrganizationSpendRow>[] = [
    {
      id: "organization",
      header: t("admin.ai_costs.cols.organization"),
      cell: (r) =>
        r.organization_id ? (
          <span className="flex items-center gap-2 font-medium text-text-strong">
            <Building2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            {r.organization_name}
          </span>
        ) : (
          // Named, not blank: this row is the part of the bill the derivation
          // could not place, and it has to read that way.
          <span className="italic text-text-muted">
            {t("admin.ai_costs.unattributed")}
          </span>
        ),
    },
    {
      id: "calls",
      header: t("admin.ai_costs.cols.calls"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums">
          {r.failed_count > 0 ? (
            <span className="text-red-700">
              {r.failed_count} / {r.call_count}
            </span>
          ) : (
            r.call_count
          )}
        </span>
      ),
    },
    {
      id: "tokens",
      header: t("admin.ai_costs.cols.tokens"),
      align: "right",
      cell: (r) => <span className="tabular-nums">{r.tokens}</span>,
    },
    {
      id: "spend",
      header: t("admin.ai_costs.cols.spend"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums font-semibold">
          ${r.spend_usd.toFixed(4)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <p className="flex items-start gap-1.5 text-xs text-text-muted">
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {data.coverage_pct === null
          ? t("admin.ai_costs.coverage_no_spend")
          : t("admin.ai_costs.coverage", {
              pct: data.coverage_pct.toFixed(1),
              attributed: data.attributed_spend_usd.toFixed(4),
              total: data.total_spend_usd.toFixed(4),
            })}
      </p>
      <DataTable
        columns={columns}
        data={data.items}
        getRowId={(r) => r.organization_id ?? "unattributed"}
      />
    </div>
  );
}

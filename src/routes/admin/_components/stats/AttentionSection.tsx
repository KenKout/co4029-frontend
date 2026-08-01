import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight } from "lucide-react";

import { AttentionRow } from "./AttentionRow";
import { RowHeading } from "./RowHeading";
import type { AdminStatsController } from "./types";

/** Row 4: the needs-attention checklist. */
export function AttentionSection({ c }: { c: AdminStatsController }) {
  const { t, attentionItems, clearCount } = c;

  return (
    <section className="space-y-3">
      <RowHeading>{t("admin.dashboard.rows.attention")}</RowHeading>
      {attentionItems.length > 0 ? (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {attentionItems.map((item) => (
            <AttentionRow
              key={item.key}
              label={item.label}
              count={item.count}
              to={item.to}
              search={item.search}
              severity={item.severity}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-5 py-4">
          <CheckCircle2
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-emerald-600"
          />
          <p className="text-sm text-text-muted">
            {t("admin.dashboard.attention.all_clear")}
          </p>
        </div>
      )}
      {clearCount > 0 && attentionItems.length > 0 && (
        <p className="text-xs text-text-muted">
          {t("admin.dashboard.attention.also_clear", { count: clearCount })}
        </p>
      )}
      {/* Security review is a standing task, not a count: there's no
          "zero permission changes to review" state that means done, so it's a
          plain link rather than a checklist row with a fabricated 0. */}
      <Link
        to="/admin/audit-logs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-m3-primary hover:underline"
      >
        {t("admin.dashboard.attention.audit_review")}
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

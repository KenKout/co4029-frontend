import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  ChangeImpact,
  RuntimeSetting,
} from "@/lib/api/hooks/admin-settings";
import { cn } from "@/lib/utils";

/** One pending change: what it is now, what it becomes, and who it reaches. */
export function ChangeImpactRow({
  impact,
  setting,
}: {
  impact: ChangeImpact;
  setting: RuntimeSetting | undefined;
}) {
  const { t } = useTranslation();
  const inherited = impact.new_value === null;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        impact.unchanged
          ? "border-border bg-surface-muted"
          : "border-border bg-card",
      )}
    >
      <p className="text-sm font-semibold text-text-strong">{impact.label}</p>
      <p className="mt-0.5 font-mono text-xs text-text-muted">{impact.key}</p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded bg-surface-muted px-2 py-0.5 font-mono tabular-nums text-text-muted">
          {String(impact.current_value)}
        </span>
        <span aria-hidden="true" className="text-text-subtle">
          →
        </span>
        <span className="rounded bg-m3-primary-fixed px-2 py-0.5 font-mono tabular-nums text-m3-primary">
          {inherited
            ? t("admin_settings.apply.inherited", {
                value: String(setting?.default_value ?? ""),
              })
            : String(impact.new_value)}
        </span>
        {impact.unchanged && (
          <span className="text-xs text-text-muted">
            {t("admin_settings.apply.no_change")}
          </span>
        )}
      </div>

      {/* ADM-034: say plainly that this is not retroactive. Operators have
          assumed otherwise and waited for numbers that were never going to
          move without a reprocess. */}
      {impact.requires_reprocess && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          {t("admin_settings.apply.next_ingest_only")}
        </p>
      )}
    </div>
  );
}

import { STATUS_FILTERS } from "./constants";
import type { AdminProcessingController } from "./use-admin-processing";

export function StatusFilterBar({ c }: { c: AdminProcessingController }) {
  const { t, statusFilter, setStatusFilter } = c;
  return (
    <div className="bg-surface-elev border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-text-muted mr-2">
          {t("admin.processing.filter_status")}:
        </span>
        {STATUS_FILTERS.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <button
              type="button"
              key={opt.value || "all"}
              onClick={() => setStatusFilter(opt.value)}
              className={
                active
                  ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white"
                  : "px-3 py-1.5 text-xs font-semibold rounded-md bg-surface-muted text-text-strong hover:bg-surface-muted/70"
              }
            >
              {t(opt.i18nKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

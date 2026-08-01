import type { AtRiskStudent } from "@/lib/api/types";

import { FLAG_ICONS, FLAG_KEYS, FLAG_LABEL_KEYS } from "./constants";
import type { TranslateFn } from "./constants";

/** One per-flag tile: live count, label, what it means and what to do. */
export function FlagSummaryCards({
  students,
  isLoading,
  t,
}: {
  students: AtRiskStudent[];
  isLoading: boolean;
  t: TranslateFn;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {FLAG_KEYS.map((key) => {
        const Icon = FLAG_ICONS[key];
        const count = students.filter((s) => s[key]).length;
        const meta = FLAG_LABEL_KEYS[key];
        return (
          <div
            key={key}
            className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4 flex items-start gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-heading font-black text-m3-primary">
                  {isLoading ? "—" : count}
                </p>
                <p className="text-sm font-bold text-m3-on-surface truncate">
                  {t(meta.label)}
                </p>
              </div>
              <p className="text-xs text-m3-on-surface-variant mt-1 leading-snug">
                {t(meta.desc)}
              </p>
              <p className="text-xs text-m3-primary/80 mt-1 leading-snug">
                {t(meta.action)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

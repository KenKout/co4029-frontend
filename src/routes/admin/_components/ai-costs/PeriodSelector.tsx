import { useTranslation } from "react-i18next";
import type { AiCostsPeriod } from "@/lib/api/hooks/admin";
import { Button } from "@/components/ui/button";
import { PERIOD_VALUES } from "./constants";

/** Radiogroup switching the dashboard-wide lookback window. */
export function PeriodSelector({
  value,
  onChange,
}: {
  value: AiCostsPeriod;
  onChange: (next: AiCostsPeriod) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t("admin.ai_costs.period_aria")}
      className="inline-flex flex-wrap gap-2 bg-surface-elev border border-border rounded-lg p-1"
    >
      {PERIOD_VALUES.map((p) => {
        const active = p === value;
        return (
          <Button variant="ghost"
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={
              active
                ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white cursor-pointer"
                : "px-3 py-1.5 text-xs font-semibold rounded-md text-text-strong hover:bg-surface-muted cursor-pointer transition-colors duration-200"
            }
          >
            {t(`admin.ai_costs.period_options.${p}`)}
          </Button>
        );
      })}
    </div>
  );
}

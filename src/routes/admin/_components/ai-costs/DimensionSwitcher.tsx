import { useTranslation } from "react-i18next";
import type { AiCostsDimension } from "@/lib/api/hooks/admin";
import { DIMENSION_VALUES } from "./constants";

/** Radiogroup picking which column the by-category breakdown groups on. */
export function DimensionSwitcher({
  value,
  onChange,
}: {
  value: AiCostsDimension;
  onChange: (next: AiCostsDimension) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t("admin.ai_costs.dimension_aria")}
      className="inline-flex flex-wrap gap-2 bg-surface-elev border border-border rounded-lg p-1"
    >
      {DIMENSION_VALUES.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(d)}
            className={
              active
                ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-m3-primary text-white cursor-pointer"
                : "px-3 py-1.5 text-xs font-semibold rounded-md text-text-strong hover:bg-surface-muted cursor-pointer transition-colors duration-200"
            }
          >
            {t(`admin.ai_costs.dimension_options.${d}`)}
          </button>
        );
      })}
    </div>
  );
}

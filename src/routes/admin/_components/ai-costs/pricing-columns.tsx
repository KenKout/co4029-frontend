import type { TFunction } from "i18next";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { AiModelPricing } from "@/lib/api/types";
import type { Formatters } from "./use-formatters";

/**
 * Column spec for the model-pricing table. A plain builder rather than a hook
 * so it can be called after the panel's hooks without perturbing their order.
 */
export function buildPricingColumns(
  t: TFunction,
  fmt: Formatters,
): DataTableColumn<AiModelPricing>[] {
  return [
    {
      id: "model",
      header: t("admin.ai_costs.cols.model"),
      cell: (r) => (
        <div>
          <span className="font-mono text-xs text-text-strong">
            {r.model_name}
          </span>
          {r.notes ? (
            <p className="mt-0.5 text-xs text-text-muted">{r.notes}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "input_rate",
      header: t("admin.ai_costs.pricing.cols.input_rate"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.input_usd_per_1m)}
        </span>
      ),
    },
    {
      id: "output_rate",
      header: t("admin.ai_costs.pricing.cols.output_rate"),
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-text-strong">
          {fmt.usd.format(r.output_usd_per_1m)}
        </span>
      ),
    },
    {
      id: "updated",
      header: t("admin.ai_costs.pricing.cols.updated"),
      cell: (r) => (
        <span className="whitespace-nowrap text-xs text-text-muted">
          {fmt.datetime.format(new Date(r.updated_at))}
        </span>
      ),
    },
  ];
}

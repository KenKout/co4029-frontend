import { useTranslation } from "react-i18next";
import { Info, X } from "lucide-react";
import {
  useAiCostsByCategory,
  useAiCostsByModel,
  type AiCostsFilters,
  type AiCostsPeriod,
} from "@/lib/api/hooks/admin";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

/**
 * Dashboard-wide model / role / operation / status filter row.
 *
 * Model and Role used to be free-text <Input>s with `e.g. gpt-4o` hints. Three
 * problems, all reported by a user who couldn't make them work:
 *
 *  1. The server matches EXACTLY (`amc.model_name = :f_model`), so a partial
 *     "gpt" returned nothing — it only worked if you typed a full model name.
 *  2. There was no way to discover the valid values, and the placeholder itself
 *     was wrong for this deployment (no `gpt-4o` row exists; it's `gpt-4.1-mini`).
 *  3. Layout: `<label>` is display:inline, so beside an `<input>` it sat on the
 *     same line, while the block-level <Select> trigger pushed its label above —
 *     identical markup rendering two different shapes (the visible mismatch).
 *
 * Model and Role are CLOSED SETS (12 models, ~15 roles here), so a dropdown is
 * the right control, not a search box: it can't be mistyped and it doubles as
 * documentation. Options come from the existing by-model / by-category(role)
 * endpoints, so this needs no backend change. Every control now sits in a
 * `flex flex-col` cell, so all four labels align.
 *
 * The note is deliberate: only /summary, /by-category and /by-model accept these
 * params server-side — top users, pipelines and recent calls ignore them. Saying
 * so is what stops the filter looking broken when half the page doesn't react.
 */
export function FilterBar({
  filters,
  onChange,
  period,
}: {
  filters: AiCostsFilters;
  onChange: (next: AiCostsFilters) => void;
  /** Same window as the dashboard, so the option lists match what's charted. */
  period: AiCostsPeriod;
}) {
  const { t } = useTranslation();

  // Unfiltered option sources: pass no filters so narrowing one dimension can't
  // empty the other's dropdown and strand the user with no way back.
  const models = useAiCostsByModel({ period, topN: 200 });
  const roles = useAiCostsByCategory({
    dimension: "role",
    period,
    topN: 200,
  });

  const active = Object.values(filters).some((v) => v);
  const set = (key: keyof AiCostsFilters, value: string) =>
    onChange({ ...filters, [key]: value.trim() || null });

  const anyLabel = t("admin.ai_costs.filters.any");
  const modelOptions = [
    { value: "", label: anyLabel },
    ...(models.data ?? []).map((m) => ({
      value: m.model_name,
      label: m.model_name,
    })),
  ];
  const roleOptions = [
    { value: "", label: anyLabel },
    ...(roles.data ?? []).map((r) => ({
      value: r.dimension_value,
      label: r.dimension_value,
    })),
  ];

  return (
    <div className="space-y-2 bg-surface-elev border border-border rounded-lg p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text-muted">
            {t("admin.ai_costs.filters.model")}
          </label>
          <Select
            aria-label={t("admin.ai_costs.filters.model")}
            value={filters.model ?? ""}
            onValueChange={(next) => set("model", next)}
            options={modelOptions}
            className="w-56 h-9"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text-muted">
            {t("admin.ai_costs.filters.role")}
          </label>
          <Select
            aria-label={t("admin.ai_costs.filters.role")}
            value={filters.role ?? ""}
            onValueChange={(next) => set("role", next)}
            options={roleOptions}
            className="w-56 h-9"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text-muted">
            {t("admin.ai_costs.filters.operation")}
          </label>
          <Select
            aria-label={t("admin.ai_costs.filters.operation")}
            value={filters.operation ?? ""}
            onValueChange={(next) => set("operation", next)}
            options={[
              { value: "", label: anyLabel },
              { value: "chat_completion", label: "chat_completion" },
              { value: "embedding", label: "embedding" },
            ]}
            className="w-40 h-9"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-text-muted">
            {t("admin.ai_costs.filters.status")}
          </label>
          <Select
            aria-label={t("admin.ai_costs.filters.status")}
            value={filters.status ?? ""}
            onValueChange={(next) => set("status", next)}
            options={[
              { value: "", label: anyLabel },
              { value: "success", label: "success" },
              { value: "failed", label: "failed" },
            ]}
            className="w-40 h-9"
          />
        </div>

        {active ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                model: null,
                role: null,
                operation: null,
                status: null,
              })
            }
          >
            <X className="h-4 w-4 mr-1" />
            {t("admin.ai_costs.filters.clear")}
          </Button>
        ) : null}
      </div>

      {active ? (
        <p className="flex items-start gap-1.5 text-xs text-text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("admin.ai_costs.filters.partial_note")}</span>
        </p>
      ) : null}
    </div>
  );
}

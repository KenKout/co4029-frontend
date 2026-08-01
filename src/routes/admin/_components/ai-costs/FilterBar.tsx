import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { AiCostsFilters } from "@/lib/api/hooks/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

/** Dashboard-wide model / role / operation / status filter row. */
export function FilterBar({
  filters,
  onChange,
}: {
  filters: AiCostsFilters;
  onChange: (next: AiCostsFilters) => void;
}) {
  const { t } = useTranslation();
  const active = Object.values(filters).some((v) => v);
  const set = (key: keyof AiCostsFilters, value: string) =>
    onChange({ ...filters, [key]: value.trim() || null });
  return (
    <div className="flex flex-wrap items-end gap-3 bg-surface-elev border border-border rounded-lg p-4">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-muted">
          {t("admin.ai_costs.filters.model")}
        </label>
        <Input
          value={filters.model ?? ""}
          onChange={(e) => set("model", e.target.value)}
          placeholder={t("admin.ai_costs.filters.model_placeholder")}
          className="w-40 h-9"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-muted">
          {t("admin.ai_costs.filters.role")}
        </label>
        <Input
          value={filters.role ?? ""}
          onChange={(e) => set("role", e.target.value)}
          placeholder={t("admin.ai_costs.filters.role_placeholder")}
          className="w-40 h-9"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-muted">
          {t("admin.ai_costs.filters.operation")}
        </label>
        <Select
          value={filters.operation ?? ""}
          onValueChange={(next) => set("operation", next)}
          options={[
            { value: "", label: t("admin.ai_costs.filters.any") },
            { value: "chat_completion", label: "chat_completion" },
            { value: "embedding", label: "embedding" },
          ]}
          className="w-40 h-9"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-text-muted">
          {t("admin.ai_costs.filters.status")}
        </label>
        <Select
          value={filters.status ?? ""}
          onValueChange={(next) => set("status", next)}
          options={[
            { value: "", label: t("admin.ai_costs.filters.any") },
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
            onChange({ model: null, role: null, operation: null, status: null })
          }
        >
          <X className="h-4 w-4 mr-1" />
          {t("admin.ai_costs.filters.clear")}
        </Button>
      ) : null}
    </div>
  );
}

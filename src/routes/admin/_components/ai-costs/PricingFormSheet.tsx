import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { AiModelPricingInput } from "@/lib/api/hooks/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import type { AiModelPricing } from "@/lib/api/types";
import { EMPTY_PRICING_FORM } from "./constants";
import type { PricingFormState } from "./types";

/** Add/edit sheet for a model's per-1M-token rates. */
export function PricingFormSheet({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AiModelPricing | null;
  onSubmit: (values: AiModelPricingInput) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PricingFormState>(EMPTY_PRICING_FORM);

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            model_name: editing.model_name,
            input_usd_per_1m: String(editing.input_usd_per_1m),
            output_usd_per_1m: String(editing.output_usd_per_1m),
            notes: editing.notes ?? "",
          }
        : EMPTY_PRICING_FORM,
    );
  }, [open, editing]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const inputRate = Number(form.input_usd_per_1m);
    const outputRate = Number(form.output_usd_per_1m);
    if (
      !form.model_name.trim() ||
      Number.isNaN(inputRate) ||
      Number.isNaN(outputRate)
    ) {
      return;
    }
    onSubmit({
      model_name: form.model_name.trim(),
      input_usd_per_1m: inputRate,
      output_usd_per_1m: outputRate,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-6">
        <h2 className="font-headline text-lg font-bold text-text-strong">
          {editing
            ? t("admin.ai_costs.pricing.edit_title")
            : t("admin.ai_costs.pricing.add_title")}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.model_name")}
            </label>
            <Input
              value={form.model_name}
              disabled={Boolean(editing)}
              onChange={(e) =>
                setForm((f) => ({ ...f, model_name: e.target.value }))
              }
              placeholder="gpt-4o-mini"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.input_rate")}
            </label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={form.input_usd_per_1m}
              onChange={(e) =>
                setForm((f) => ({ ...f, input_usd_per_1m: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.output_rate")}
            </label>
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={form.output_usd_per_1m}
              onChange={(e) =>
                setForm((f) => ({ ...f, output_usd_per_1m: e.target.value }))
              }
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-muted">
              {t("admin.ai_costs.pricing.fields.notes")}
            </label>
            <Input
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <SheetClose render={<Button type="button" variant="ghost" />}>
              {t("admin.ai_costs.pricing.cancel")}
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {t("admin.ai_costs.pricing.save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

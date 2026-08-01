import { useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import {
  useAiModelPricing,
  useCreateAiModelPricing,
  useDeleteAiModelPricing,
  useUpdateAiModelPricing,
  type AiModelPricingInput,
} from "@/lib/api/hooks/admin";
import { ApiError } from "@/lib/api/client";
import type { AiModelPricing } from "@/lib/api/types";

/**
 * Stateful half of the model-pricing panel: the list query, the three
 * mutations, the sheet/delete-target state, and the submit/delete handlers.
 *
 * `t` is injected rather than resolved here so the hook adds no extra
 * `useTranslation` call — the panel keeps the exact hook call order it had
 * while everything lived in one `PricingSection` function.
 */
export function usePricingSection(t: TFunction) {
  const pricing = useAiModelPricing();
  const createMutation = useCreateAiModelPricing();
  const updateMutation = useUpdateAiModelPricing();
  const deleteMutation = useDeleteAiModelPricing();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AiModelPricing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiModelPricing | null>(null);

  const handleSubmit = (values: AiModelPricingInput) => {
    const onError = (err: unknown) => {
      const message = err instanceof ApiError ? err.message : undefined;
      toast.error(message ?? t("admin.ai_costs.pricing.save_failed"));
    };
    if (editing) {
      updateMutation.mutate(
        {
          id: editing.id,
          input_usd_per_1m: values.input_usd_per_1m,
          output_usd_per_1m: values.output_usd_per_1m,
          notes: values.notes,
        },
        {
          onSuccess: () => {
            toast.success(t("admin.ai_costs.pricing.save_success"));
            setSheetOpen(false);
          },
          onError,
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success(t("admin.ai_costs.pricing.save_success"));
          setSheetOpen(false);
        },
        onError,
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t("admin.ai_costs.pricing.delete_success"));
        setDeleteTarget(null);
      },
      onError: () => {
        toast.error(t("admin.ai_costs.pricing.delete_failed"));
      },
    });
  };

  return {
    pricing,
    createMutation,
    updateMutation,
    deleteMutation,
    sheetOpen,
    setSheetOpen,
    editing,
    setEditing,
    deleteTarget,
    setDeleteTarget,
    handleSubmit,
    handleDelete,
  };
}

import { useTranslation } from "react-i18next";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PricingFormSheet } from "./PricingFormSheet";
import { buildPricingColumns } from "./pricing-columns";
import { useFormatters } from "./use-formatters";
import { usePricingSection } from "./use-pricing-section";

/** Model-pricing CRUD panel: rate table plus add/edit sheet and delete dialog. */
export function PricingSection() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const {
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
  } = usePricingSection(t);

  const columns = buildPricingColumns(t, fmt);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-text-muted">
          {t("admin.ai_costs.pricing.subtitle")}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("admin.ai_costs.pricing.add")}
        </Button>
      </div>

      {pricing.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.ai_costs.pricing.load_failed")}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={pricing.data ?? []}
          getRowId={(r) => r.id}
          loading={pricing.isLoading}
          emptyState={t("admin.ai_costs.empty.pricing")}
          actionsHeader={t("admin.ai_costs.cols.actions")}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("admin.ai_costs.pricing.edit")}
                onClick={() => {
                  setEditing(r);
                  setSheetOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("admin.ai_costs.pricing.delete_confirm")}
                onClick={() => setDeleteTarget(r)}
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </div>
          )}
        />
      )}

      <PricingFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("admin.ai_costs.pricing.delete_title")}
        description={t("admin.ai_costs.pricing.delete_description", {
          model: deleteTarget?.model_name ?? "",
        })}
        confirmLabel={t("admin.ai_costs.pricing.delete_confirm")}
        cancelLabel={t("admin.ai_costs.pricing.cancel")}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}

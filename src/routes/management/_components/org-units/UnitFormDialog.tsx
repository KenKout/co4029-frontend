import { useTranslation } from "react-i18next";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type useOrgUnitsPage } from "./use-org-units-page";

/**
 * Create / edit form for one org unit.
 *
 * The parent `<Select>` is the piece that was missing before: the admin
 * screen hardcoded `parent_unit_id: null`, so every unit landed at the top
 * level and the hierarchy the backend supported could never be expressed.
 * The same control does double duty as "move this unit" when editing.
 */
export function UnitFormDialog({
  controller,
}: {
  controller: ReturnType<typeof useOrgUnitsPage>;
}) {
  const { t } = useTranslation();
  const c = controller;
  const prefix = "management_org_units";
  const isEdit = c.editingId !== null;

  return (
    <PromptDialog
      open={c.dialog !== null}
      onOpenChange={(open) => {
        if (!open) c.closeDialog();
      }}
      title={isEdit ? t(`${prefix}.edit_title`) : t(`${prefix}.create_title`)}
      confirmLabel={isEdit ? t("common.save") : t("common.create")}
      cancelLabel={t("common.cancel")}
      onConfirm={c.submit}
      isPending={c.isSubmitting}
    >
      <div className="space-y-4">
        <Field label={t(`${prefix}.field_name`)} required>
          <Input
            value={c.form.name}
            onChange={(e) => c.setForm({ ...c.form, name: e.target.value })}
            maxLength={255}
            autoFocus
          />
        </Field>

        <div>
          <Field
            label={t(`${prefix}.field_code`)}
            hint={t(`${prefix}.field_code_hint`)}
          >
            <Input
              value={c.form.code}
              onChange={(e) => c.setForm({ ...c.form, code: e.target.value })}
              maxLength={50}
            />
          </Field>
        </div>

        {c.error ? (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
            <p className="text-xs break-words text-danger">{c.error}</p>
          </div>
        ) : null}
      </div>
    </PromptDialog>
  );
}

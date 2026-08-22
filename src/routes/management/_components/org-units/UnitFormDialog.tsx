import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { flattenOrgUnits } from "@/lib/org-unit-tree-helpers";
import {
  UNIT_TYPES,
  type UnitType,
  type useOrgUnitsPage,
} from "./use-org-units-page";

const ROOT = "__root__";

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

  // Indented labels give the flat <Select> the shape of the tree it stands
  // in for — "Engineering / Computer Science" reads as a path, not a list.
  const parentOptions = [
    { value: ROOT, label: t(`${prefix}.no_parent`) },
    ...flattenOrgUnits(c.parentCandidates).map((u) => ({
      value: u.id,
      label: `${"  ".repeat(u.depth)}${u.name}`,
    })),
  ];

  const movedParent =
    isEdit &&
    c.selected != null &&
    c.form.parentUnitId !== c.selected.parent_unit_id;

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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t(`${prefix}.field_type`)}>
            <Select<UnitType>
              value={c.form.unitType}
              onValueChange={(unitType) => c.setForm({ ...c.form, unitType })}
              options={UNIT_TYPES.map((value) => ({
                value,
                label: t(`${prefix}.unit_types.${value}`, {
                  defaultValue: value,
                }),
              }))}
            />
          </Field>
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

        <Field
          label={t(`${prefix}.field_parent`)}
          hint={
            isEdit
              ? t(`${prefix}.field_parent_hint_edit`)
              : t(`${prefix}.field_parent_hint`)
          }
        >
          <Select<string>
            value={c.form.parentUnitId ?? ROOT}
            onValueChange={(value) =>
              c.setForm({
                ...c.form,
                parentUnitId: value === ROOT ? null : value,
              })
            }
            options={parentOptions}
          />
        </Field>

        {movedParent ? (
          // Re-parenting silently changes who can reach what: an HOD assigned
          // at a unit governs its whole subtree, so moving a branch moves
          // other people's access with it.
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-900">
              {t(`${prefix}.move_warning`)}
            </p>
          </div>
        ) : null}

        {c.error ? (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
            <p className="text-xs break-words text-danger">{c.error}</p>
          </div>
        ) : null}
      </div>
    </PromptDialog>
  );
}

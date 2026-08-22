import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/use-confirm";
import {
  useCreateOrgUnit,
  useDeleteOrgUnit,
  useOrgUnits,
  useOrgUnitTree,
} from "@/lib/api/hooks/admin-organizations";
import type { UnitType } from "@/lib/api/types/admin-organizations";
import { errorMessage } from "./helpers";

/**
 * Stateful half of the org-units tab: the list query, the create/delete
 * mutations, the three form fields, the shared confirm dialog and the two
 * submit handlers.
 *
 * Hook order is identical to the original inline `UnitsTab` — translation,
 * query, create, delete, name, code, unit type, confirm.
 */
export function useUnitsTab(orgId: string) {
  const { t } = useTranslation();
  const { data: units, isLoading } = useOrgUnits(orgId);
  // The nested view backing the tree. The flat `units` list is kept because
  // the empty-state branch and the create form still key off it.
  const tree = useOrgUnitTree(orgId);
  const create = useCreateOrgUnit(orgId);
  const remove = useDeleteOrgUnit(orgId);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unitType, setUnitType] = useState<UnitType>("department");
  // Was hardcoded to null at the call site, which meant every unit created
  // here landed at the top level and the hierarchy the backend has always
  // supported could not be expressed from the admin UI at all.
  const [parentUnitId, setParentUnitId] = useState<string | null>(null);
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm({
    title: t("admin.organizations.actions.delete"),
    confirmLabel: t("admin.organizations.actions.delete"),
    cancelLabel: t("common.cancel"),
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        unit_type: unitType,
        name,
        code: code || null,
        parent_unit_id: parentUnitId,
      });
      setName("");
      setCode("");
      setParentUnitId(null);
      toast.success(t("admin.organizations.toasts.unit_added"));
    } catch (err) {
      toast.error(
        errorMessage(err, t("admin.organizations.toasts.create_failed")),
      );
    }
  }

  async function handleRemove(id: string) {
    if (
      !(await confirmDelete({
        description: t("admin.organizations.confirm.delete_unit"),
      }))
    )
      return;
    try {
      await remove.mutateAsync(id);
      toast.success(t("admin.organizations.toasts.delete_success"));
    } catch (err) {
      toast.error(
        errorMessage(err, t("admin.organizations.toasts.delete_failed")),
      );
    }
  }

  return {
    t,
    units,
    isLoading,
    create,
    name,
    setName,
    code,
    setCode,
    unitType,
    setUnitType,
    parentUnitId,
    setParentUnitId,
    treeNodes: tree.data ?? [],
    confirmDialog,
    handleAdd,
    handleRemove,
  };
}

export type UnitsTabController = ReturnType<typeof useUnitsTab>;

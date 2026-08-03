import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import {
  useOrganizations,
  useOrgUnits,
} from "@/lib/api/hooks/admin-organizations";
import { usePatchCareerPath } from "@/lib/api/hooks/career-paths";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes-warning";

export interface EditFormInitialValues {
  id: string;
  initialName: string;
  initialDescription: string;
  initialOrgUnitId: string;
  initialOrganizationId?: string;
}

/**
 * Stateful half of the metadata form: the patch mutation, the three controlled
 * fields, the resync effect when a fresh path payload lands, the dirty flag
 * feeding the unsaved-changes guard, and the submit handler.
 *
 * `t` is injected so this adds no extra `useTranslation` call and `EditForm`
 * keeps the hook call order it had when everything lived in one function.
 */
export function useEditForm(
  {
    id,
    initialName,
    initialDescription,
    initialOrgUnitId,
    initialOrganizationId,
  }: EditFormInitialValues,
  t: TFunction,
) {
  const patch = usePatchCareerPath(id);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [orgUnitId, setOrgUnitId] = useState(initialOrgUnitId);
  // The path's organization is fixed at creation (server-derived from the
  // actor's primary org) — it is NOT editable. The org select exists to scope
  // the org-unit picker, exactly like the admin user-page selector.
  const [organizationId, setOrganizationId] = useState(
    initialOrganizationId ?? "",
  );

  // Org + org-unit options for the cascading selectors. Units load for the
  // chosen org; a unit picked for a different org is never submittable.
  const orgs = useOrganizations({ limit: 200 });
  const orgOptions = orgs.items ?? [];
  const orgUnits = useOrgUnits(organizationId || undefined);
  const orgUnitOptions = orgUnits.data ?? [];

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setOrgUnitId(initialOrgUnitId);
    setOrganizationId(initialOrganizationId ?? "");
  }, [initialName, initialDescription, initialOrgUnitId, initialOrganizationId]);

  const dirty =
    name !== initialName ||
    description !== initialDescription ||
    orgUnitId !== initialOrgUnitId;

  useUnsavedChangesWarning(dirty);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    patch.mutate(
      {
        name: name.trim() !== initialName ? name.trim() : undefined,
        description:
          description.trim() !== initialDescription
            ? description.trim() || null
            : undefined,
        org_unit_id:
          orgUnitId !== initialOrgUnitId
            ? (orgUnitId.trim() || null)
            : undefined,
      },
      {
        onSuccess: () =>
          toast.success(
            t("management_career_path_detail.toasts.saved_changes"),
          ),
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_career_path_detail.errors.save_failed"),
          ),
      },
    );
  }

  return {
    patch,
    name,
    setName,
    description,
    setDescription,
    orgUnitId,
    setOrgUnitId,
    organizationId,
    setOrganizationId,
    orgOptions,
    orgUnitOptions,
    orgUnitsLoading: orgUnits.isLoading,
    dirty,
    handleSubmit,
  };
}

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { useOrganizations } from "@/lib/api/hooks/admin-organizations";
import { usePatchCareerPath } from "@/lib/api/hooks/career-paths";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes-warning";

export interface EditFormInitialValues {
  id: string;
  initialName: string;
  initialDescription: string;
  initialOrganizationId?: string;
}

/**
 * Stateful half of the metadata form: the patch mutation, the two controlled
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
    initialOrganizationId,
  }: EditFormInitialValues,
  t: TFunction,
) {
  const patch = usePatchCareerPath(id);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  // The path's organization is fixed at creation (server-derived from the
  // actor's primary org) — it is NOT editable. The org lookup exists only to
  // resolve the locked org id to its display name.
  const [organizationId, setOrganizationId] = useState(
    initialOrganizationId ?? "",
  );

  const orgs = useOrganizations({ limit: 200 });
  const orgOptions = orgs.items ?? [];

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setOrganizationId(initialOrganizationId ?? "");
  }, [initialName, initialDescription, initialOrganizationId]);

  const dirty = name !== initialName || description !== initialDescription;

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
    organizationId,
    setOrganizationId,
    orgOptions,
    dirty,
    handleSubmit,
  };
}

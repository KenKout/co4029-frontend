import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import {
  usePatchCareerPath,
  useUploadCareerPathThumbnail,
} from "@/lib/api/hooks/career-paths";
import { useUnsavedChangesWarning } from "@/lib/use-unsaved-changes-warning";

export interface EditFormInitialValues {
  id: string;
  initialName: string;
  initialSlug: string;
  initialDescription: string;
  initialThumbnailUrl?: string | null;
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
    initialSlug,
    initialDescription,
    initialThumbnailUrl,
  }: EditFormInitialValues,
  t: TFunction,
) {
  const patch = usePatchCareerPath(id);
  const uploadThumbnail = useUploadCareerPathThumbnail(id);
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [description, setDescription] = useState(initialDescription);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  useEffect(() => {
    setName(initialName);
    setSlug(initialSlug);
    setDescription(initialDescription);
    setThumbnailFile(null);
  }, [initialName, initialSlug, initialDescription, initialThumbnailUrl]);

  const metadataDirty =
    name !== initialName ||
    slug !== initialSlug ||
    description !== initialDescription;
  const dirty = metadataDirty || thumbnailFile !== null;

  useUnsavedChangesWarning(dirty);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (metadataDirty) {
        await patch.mutateAsync({
          name: name.trim() !== initialName ? name.trim() : undefined,
          slug: slug.trim() !== initialSlug ? slug.trim() : undefined,
          description:
            description.trim() !== initialDescription
              ? description.trim() || null
              : undefined,
        });
      }
      if (thumbnailFile) {
        await uploadThumbnail.mutateAsync(thumbnailFile);
        setThumbnailFile(null);
      }
      toast.success(t("management_career_path_detail.toasts.saved_changes"));
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t("management_career_path_detail.errors.save_failed"),
      );
    }
  }

  return {
    patch,
    name,
    setName,
    slug,
    setSlug,
    description,
    setDescription,
    thumbnailFile,
    setThumbnailFile,
    isPending: patch.isPending || uploadThumbnail.isPending,
    dirty,
    handleSubmit,
  };
}

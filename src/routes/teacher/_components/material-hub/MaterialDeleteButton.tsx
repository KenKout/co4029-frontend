import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { useDeleteMaterial } from "@/lib/api/hooks/materials";

/**
 * Confirm half of the two-click delete pattern in the material history.
 * Extracted verbatim from the former 1422-line material-hub.tsx.
 */
export function MaterialDeleteButton({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const del = useDeleteMaterial(id);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={del.isPending}
      onClick={() =>
        del.mutate(undefined, {
          onSuccess: () => {
            toast.success(t("teacher_lesson_materials.toasts.deleted"));
            onDeleted();
          },
          onError: (err) => {
            if (err instanceof ApiError && err.status === 403) {
              toast.error(
                t("teacher_lesson_materials.toasts.delete_forbidden"),
              );
              return;
            }
            if (
              err instanceof ApiError &&
              err.status === 409 &&
              err.code === "material_busy"
            ) {
              toast.error(t("teacher_lesson_materials.toasts.delete_busy"));
              return;
            }
            toast.error(
              (err as Error).message ||
                t("teacher_lesson_materials.toasts.delete_failed"),
            );
          },
        })
      }
    >
      {del.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        t("teacher_lesson_materials.actions.confirm_delete")
      )}
    </Button>
  );
}

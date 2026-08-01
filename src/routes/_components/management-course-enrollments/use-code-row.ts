import { useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { useDeleteInvitationCode } from "@/lib/api/hooks/enrollments";
import type { InvitationCodeAuthoring } from "@/lib/api/types";

/**
 * Per-row state for one invitation code: the delete mutation, whether the row is
 * currently asking for confirmation, and the copy-to-clipboard action.
 *
 * Hook calls are in the exact order `CodeRow` used to make them (delete mutation
 * -> local state), and `t` is injected so no extra `useTranslation` is added.
 */
export function useCodeRow(
  item: InvitationCodeAuthoring,
  courseId: string,
  t: TFunction,
) {
  const del = useDeleteInvitationCode(item.id, courseId);
  const [confirming, setConfirming] = useState(false);

  function handleCopy() {
    void navigator.clipboard
      .writeText(item.code)
      .then(() =>
        toast.success(t("management_course_enrollments.toasts.code_copied")),
      )
      .catch(() =>
        toast.error(t("management_course_enrollments.toasts.copy_failed")),
      );
  }

  function handleDelete() {
    del.mutate(undefined, {
      onSuccess: () => {
        toast.success(t("management_course_enrollments.toasts.code_deleted"));
        setConfirming(false);
      },
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("management_course_enrollments.toasts.code_delete_failed"),
        ),
    });
  }

  return { del, confirming, setConfirming, handleCopy, handleDelete };
}

export type CodeRowController = ReturnType<typeof useCodeRow>;

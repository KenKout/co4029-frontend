import { useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import { usePatchInvitationCode } from "@/lib/api/hooks/enrollments";
import type { InvitationCodeAuthoring } from "@/lib/api/types";
import { dateInputToIso, formatDateInputValue } from "./helpers";

/**
 * Form state for editing one invitation code, seeded from the row being edited.
 *
 * Hook calls are in the exact order `EditCodeModal` used to make them (patch
 * mutation -> the three field states), and `t` is injected so no extra
 * `useTranslation` is added.
 */
export function useEditCodeForm(
  item: InvitationCodeAuthoring,
  courseId: string,
  t: TFunction,
  onClose: () => void,
) {
  const patch = usePatchInvitationCode(item.id, courseId);
  const [isActive, setIsActive] = useState(item.is_active);
  const [expiresAt, setExpiresAt] = useState(
    formatDateInputValue(item.expires_at ?? null),
  );
  const [maxUses, setMaxUses] = useState(
    item.max_uses != null ? String(item.max_uses) : "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    patch.mutate(
      {
        is_active: isActive,
        expires_at: dateInputToIso(expiresAt),
        max_uses: maxUses ? Number(maxUses) : null,
      },
      {
        onSuccess: () => {
          toast.success(t("management_course_enrollments.toasts.code_updated"));
          onClose();
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_course_enrollments.toasts.code_update_failed"),
          ),
      },
    );
  }

  return {
    patch,
    isActive,
    setIsActive,
    expiresAt,
    setExpiresAt,
    maxUses,
    setMaxUses,
    handleSubmit,
  };
}

export type EditCodeFormController = ReturnType<typeof useEditCodeForm>;

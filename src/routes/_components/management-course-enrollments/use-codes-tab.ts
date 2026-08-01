import { useState } from "react";
import { toast } from "sonner";
import type { TFunction } from "i18next";
import {
  useCreateInvitationCode,
  useListInvitationCodes,
} from "@/lib/api/hooks/enrollments";
import type { InvitationCodeAuthoring } from "@/lib/api/types";
import { dateInputToIso } from "./helpers";

/**
 * Everything stateful behind the invitation-codes tab: the code list query, the
 * create mutation, the three create-form fields and which code is being edited.
 *
 * Hook calls are in the exact order `CodesTab` used to make them (list query ->
 * create mutation -> local state), and `t` is injected so no extra
 * `useTranslation` is added.
 */
export function useCodesTab(courseId: string, t: TFunction) {
  const list = useListInvitationCodes(courseId);
  const create = useCreateInvitationCode(courseId);
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [editing, setEditing] = useState<InvitationCodeAuthoring | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error(t("management_course_enrollments.errors.code_required"));
      return;
    }
    create.mutate(
      {
        code: code.trim(),
        expires_at: dateInputToIso(expiresAt),
        max_uses: maxUses ? Number(maxUses) : null,
      },
      {
        onSuccess: () => {
          toast.success(t("management_course_enrollments.toasts.code_created"));
          setCode("");
          setExpiresAt("");
          setMaxUses("");
        },
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("management_course_enrollments.toasts.code_create_failed"),
          ),
      },
    );
  }

  return {
    list,
    create,
    code,
    setCode,
    expiresAt,
    setExpiresAt,
    maxUses,
    setMaxUses,
    editing,
    setEditing,
    handleCreate,
  };
}

export type CodesTabController = ReturnType<typeof useCodesTab>;

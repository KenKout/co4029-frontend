import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/use-confirm";
import {
  useDeleteMembership,
  usePatchMembership,
} from "@/lib/api/hooks/admin-organizations";
import type {
  MembershipRead,
  MembershipStatus,
} from "@/lib/api/types/admin-organizations";
import { errorMessage } from "./helpers";

/**
 * Stateful half of one membership row: the patch/delete mutations, the inline
 * edit toggle, the draft status and the shared confirm dialog.
 *
 * Hook order is identical to the original inline `MembershipRow` —
 * translation, patch, delete, editing flag, draft status, confirm.
 */
export function useMembershipRow(m: MembershipRead, orgId: string) {
  const { t, i18n } = useTranslation();
  const patch = usePatchMembership(orgId);
  const remove = useDeleteMembership(orgId);
  const [editing, setEditing] = useState(false);
  const [draftStatus, setDraftStatus] = useState<MembershipStatus>(
    m.status as MembershipStatus,
  );
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm({
    title: t("admin.organizations.actions.delete"),
    confirmLabel: t("admin.organizations.actions.delete"),
    cancelLabel: t("common.cancel"),
  });

  async function handleSave() {
    try {
      await patch.mutateAsync({
        membershipId: m.id,
        body: { status: draftStatus },
      });
      setEditing(false);
      toast.success(t("admin.organizations.toasts.member_updated"));
    } catch (err) {
      toast.error(
        errorMessage(err, t("admin.organizations.toasts.update_failed")),
      );
    }
  }

  async function handleRemove() {
    if (
      !(await confirmDelete({
        description: t("admin.organizations.confirm.delete_membership"),
      }))
    )
      return;
    try {
      await remove.mutateAsync(m.id);
      toast.success(t("admin.organizations.toasts.delete_success"));
    } catch (err) {
      toast.error(
        errorMessage(err, t("admin.organizations.toasts.delete_failed")),
      );
    }
  }

  return {
    t,
    i18n,
    patch,
    editing,
    setEditing,
    draftStatus,
    setDraftStatus,
    confirmDialog,
    handleSave,
    handleRemove,
  };
}

export type MembershipRowController = ReturnType<typeof useMembershipRow>;

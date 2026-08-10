import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import {
  useAdminUser,
  useDisableUser,
  useEnableUser,
} from "@/lib/api/hooks/admin";
import { usePermissions } from "@/lib/auth/use-permissions";

import { activeLanguage, isUserDisabled, userDisplayName } from "./helpers";

/**
 * Permission gate, queries, mutations and derived labels for the admin
 * user-detail page.
 *
 * Hook call order is identical to the original component body: translation →
 * route params → permissions → the confirm-dialog flag → the permission
 * requirement → user detail query → disable → enable. Every hook still runs
 * before the permission skeleton short-circuits, exactly as before.
 */
export function useAdminUserDetail() {
  const { t, i18n } = useTranslation();
  const params = useParams({ strict: false }) as { userId?: string };
  const userId = params.userId ?? "";
  const locale = activeLanguage(i18n.resolvedLanguage, i18n.language);

  const permissions = usePermissions();
  const canAdmin = permissions.has("system.administer");

  const [confirmOpen, setConfirmOpen] = useState(false);

  const enabled = !permissions.isLoading && canAdmin && Boolean(userId);
  const detail = useAdminUser(enabled ? userId : "");
  const disable = useDisableUser(userId);
  const enable = useEnableUser(userId);

  const handleDisable = () => {
    setConfirmOpen(false);
    disable.mutate(undefined, {
      onSuccess: (out) =>
        toast.success(
          t("admin.users.roles.success.disabled", {
            count: out.revoked_session_count,
          }),
        ),
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("admin.users.roles.errors.disable_failed"),
        ),
    });
  };

  const handleEnable = () => {
    enable.mutate(undefined, {
      onSuccess: () => toast.success(t("admin.users.roles.success.enabled")),
      onError: (err) =>
        toast.error(
          (err as Error).message || t("admin.users.roles.errors.enable_failed"),
        ),
    });
  };

  const data = detail.data;
  const user = data?.user;
  const displayName = userDisplayName(user);
  const isDisabled = isUserDisabled(user);

  return {
    t,
    locale,
    permissionsLoading: permissions.isLoading,
    canAdmin,
    confirmOpen,
    setConfirmOpen,
    detail,
    data,
    user,
    displayName,
    isDisabled,
    disableIsPending: disable.isPending,
    enableIsPending: enable.isPending,
    handleDisable,
    handleEnable,
  };
}

export type UserDetailController = ReturnType<typeof useAdminUserDetail>;

import { CheckCircle2, Mail, ShieldOff, UserCircle } from "lucide-react";

import { UserStatusBadgeMd as StatusBadge } from "@/components/ui/status-badges";
import { Button } from "@/components/ui/button";

import type { AdminUserRecord } from "./types";
import type { UserDetailController } from "./use-admin-user-detail";

/** Avatar card: identity, status badge and the enable/disable action. */
export function UserDetailHeader({
  c,
  user,
}: {
  c: UserDetailController;
  user: AdminUserRecord;
}) {
  const {
    t,
    displayName,
    isDisabled,
    handleEnable,
    enableIsPending,
    disableIsPending,
    setConfirmOpen,
  } = c;

  return (
    <div className="bg-surface-elev border border-border rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
          <UserCircle className="h-7 w-7 text-m3-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-headline font-bold text-text-strong">
              {displayName}
            </h1>
            <StatusBadge status={user.status} />
          </div>
          <p className="text-sm text-text-muted mt-1 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {user.primary_email}
          </p>
          <p className="text-xs text-text-subtle mt-2 font-mono break-all">
            {user.id}
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {isDisabled ? (
            <Button variant="ghost"
              type="button"
              onClick={handleEnable}
              disabled={enableIsPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {enableIsPending
                ? t("admin.users.actions.disabling")
                : t("admin.users.actions.enable")}
            </Button>
          ) : (
            <Button variant="ghost"
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={disableIsPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              <ShieldOff className="h-3.5 w-3.5" />
              {t("admin.users.actions.disable")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

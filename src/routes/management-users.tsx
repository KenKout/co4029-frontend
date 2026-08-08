import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, Loader2, Mail, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { UserStatusBadge } from "@/components/ui/status-badges";
import { ConfirmDisableDialog } from "@/routes/admin/_components/user-detail/ConfirmDisableDialog";
import {
  usePermissions,
  useRequirePermission,
} from "@/lib/auth/use-permissions";
import { useListRoles } from "@/lib/api/hooks/admin";
import { useManagedOrgUsers } from "@/lib/api/hooks/managed-users";
import type { ManagedOrgUserRow } from "@/lib/api/hooks/managed-users";
import { ROLE_BADGE_COLOR } from "@/routes/admin/_components/users/constants";

/**
 * Org-scoped user administration for managers: see the managers, teachers
 * and students of the caller's organization, disable / re-enable accounts
 * that belong to the org.
 *
 * Peer rows (anyone holding the manager / hod / admin role in this org) get
 * no action button — the backend enforces the same rule with a 403
 * (``_assert_can_manage_user``), so the UI and the guard agree. The caller's
 * own row is also action-less.
 *
 * Rows come from ``GET /admin/users``, which resolves the org server-side
 * (manager → their org; IT admin → global), so the manager never needs to
 * pick an org — there is only theirs.
 */

const PEER_ROLE_CODES = new Set(["manager", "hod", "admin"]);

function RoleChip({ code, label }: { code: string; label: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-md ${
        ROLE_BADGE_COLOR[code] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {label}
    </span>
  );
}

function UserRow({
  user,
  isSelf,
  canManage,
  onDisable,
  onEnable,
  pending,
  labelFor,
  formatDate,
}: {
  user: ManagedOrgUserRow;
  isSelf: boolean;
  canManage: boolean;
  onDisable: (userId: string) => void;
  onEnable: (userId: string) => void;
  pending: boolean;
  labelFor: (code: string) => string;
  formatDate: (iso: unknown) => string;
}) {
  const { t } = useTranslation();
  const displayName = user.display_name?.trim() || user.primary_email;
  const isPeer = user.role_codes.some((code) => PEER_ROLE_CODES.has(code));
  const showAction = canManage && !isSelf && !isPeer;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card ghost-border">
      <div className="w-9 h-9 rounded-full bg-m3-primary-fixed flex items-center justify-center shrink-0">
        <Users className="h-4 w-4 text-m3-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {displayName}
        </p>
        <p className="text-[11px] text-m3-on-surface-variant truncate font-mono mt-0.5 flex items-center gap-1">
          <Mail className="h-3 w-3 shrink-0" />
          {user.primary_email}
        </p>
      </div>
      <div className="flex flex-wrap gap-1 justify-end max-w-[220px] shrink-0">
        {user.role_codes.map((code) => (
          <RoleChip key={code} code={code} label={labelFor(code)} />
        ))}
        {user.role_codes.length === 0 && (
          <span className="text-xs text-m3-on-surface-variant italic">
            {t("admin.users.roles.none", { defaultValue: "No role" })}
          </span>
        )}
      </div>
      <UserStatusBadge status={user.status} />
      <span className="text-xs text-m3-on-surface-variant whitespace-nowrap hidden lg:block w-24 text-right">
        {formatDate(user.created_at)}
      </span>
      {showAction &&
        (user.status === "active" || user.status === "invited" ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-danger hover:bg-red-50 shrink-0"
            disabled={pending}
            onClick={() => onDisable(user.user_id)}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Ban className="h-3.5 w-3.5" />
            )}
            {t("admin.users.actions.disable", { defaultValue: "Disable" })}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-emerald-700 hover:bg-emerald-50 shrink-0"
            disabled={pending}
            onClick={() => onEnable(user.user_id)}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {t("admin.users.actions.enable", { defaultValue: "Enable" })}
          </Button>
        ))}
      {isPeer && canManage && !isSelf && (
        <span className="text-[11px] text-m3-on-surface-variant italic shrink-0 hidden sm:block">
          {t("management_users.peer_row", {
            defaultValue: "Peer account",
          })}
        </span>
      )}
    </div>
  );
}

export default function ManagementUsersPage() {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const permissions = usePermissions();
  const canManage = permissions.has("user.disable");

  useRequirePermission(permissions.has("user.read"), {
    messageKey: "common.no_permission",
  });

  const c = useManagedOrgUsers();
  const roles = useListRoles();
  const labelFor = new Map(
    (roles.data ?? []).map((r) => [r.role.code, r.role.name]),
  );
  const [confirmTarget, setConfirmTarget] = useState<ManagedOrgUserRow | null>(
    null,
  );

  const formatDate = (iso: unknown) => {
    if (!iso) return "—";
    const d = new Date(iso as string);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
  };

  if (c.isLoading || permissions.isLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <PageSkeleton key={i} />
        ))}
      </div>
    );
  }

  const confirmUser = confirmTarget;
  const pendingId = c.pendingUserId;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("management_users.title", {
          defaultValue: "Users",
        })}
        subtitle={t("management_users.subtitle", {
          defaultValue:
            "Accounts in your organization. You can disable or re-enable teachers and students — peer manager/HOD/admin accounts are protected.",
        })}
      />

      {c.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.users.roles.errors.load_failed", {
              defaultValue: "Failed to load users.",
            })}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {c.items.map((user) => (
              <UserRow
                key={user.user_id}
                user={user}
                isSelf={me?.id === user.user_id}
                canManage={canManage}
                onDisable={(userId) =>
                  setConfirmTarget(
                    c.items.find((u) => u.user_id === userId) ?? null,
                  )
                }
                onEnable={(userId) => c.enable(userId)}
                pending={pendingId === user.user_id}
                labelFor={(code) => labelFor.get(code) ?? code}
                formatDate={formatDate}
              />
            ))}
            {c.items.length === 0 && (
              <p className="text-sm text-m3-on-surface-variant italic py-8 text-center">
                {t("admin.users.empty_title", { defaultValue: "No users yet" })}
              </p>
            )}
          </div>

          {c.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={c.isFetchingNextPage}
                onClick={c.fetchNextPage}
              >
                {c.isFetchingNextPage && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("common.load_more", { defaultValue: "Load more" })}
              </Button>
            </div>
          )}
        </>
      )}

      {confirmUser && (
        <ConfirmDisableDialog
          isPending={pendingId === confirmUser.user_id}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => {
            c.disable(confirmUser.user_id);
            setConfirmTarget(null);
          }}
        />
      )}
    </div>
  );
}

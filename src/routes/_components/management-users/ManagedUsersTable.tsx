import { useState } from "react";
import { Ban, CheckCircle2, Loader2, ShieldPlus, UserMinus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDisableDialog } from "@/routes/admin/_components/user-detail/ConfirmDisableDialog";

import { ManagedUsersToolbar } from "./ManagedUsersToolbar";
import type { ManagedUsersController } from "./use-managed-users";
import type { UserWithRoles } from "@/routes/admin/_components/users/types";

/** Roles a manager may never disable / re-enable (backend enforces 403). */
const PEER_ROLE_CODES = new Set(["manager", "hod", "admin"]);

/** Roles even a HOD cannot touch — only platform admin (backend 403). */
const ADMIN_PROTECTED_ROLE_CODES = new Set(["hod", "admin"]);

type RoleAction =
  | { kind: "grant"; userId: string; orgId: string; displayName: string }
  | { kind: "revoke"; userId: string; orgId: string; displayName: string };

/** Display name for a row, mirroring users-columns.tsx. */
function rowDisplayName(u: UserWithRoles): string {
  return u.profile?.display_name?.trim() || u.primary_email;
}

/** Which actions are available for a row (mirrors backend 403s). */
function rowCapabilities(
  c: ManagedUsersController,
  u: UserWithRoles,
  meId: string | undefined,
) {
  const isSelf = meId === u.id;
  const roles = u.roles ?? [];
  const isPeer = roles.some((code) => PEER_ROLE_CODES.has(code));
  const isAdminProtected = roles.some((code) =>
    ADMIN_PROTECTED_ROLE_CODES.has(code),
  );
  const isManager = roles.includes("manager");
  const orgId = u.organization_id ?? null;

  return {
    isSelf,
    isPeer,
    isAdminProtected,
    isManager,
    orgId,
    canDisable: c.canManage && !isSelf && !isPeer,
    canGrant: c.canAssignManager && !isSelf && !isPeer && !!orgId,
    canRevoke:
      c.canAssignManager && !isSelf && isManager && !isAdminProtected && !!orgId,
  };
}

/** Disable / Enable toggle for non-peer rows. */
function DisableEnableButton({
  c,
  u,
  pending,
  onDisable,
}: {
  c: ManagedUsersController;
  u: UserWithRoles;
  pending: boolean;
  onDisable: (userId: string) => void;
}) {
  const { t } = useTranslation();
  const isActive = u.status === "active" || u.status === "invited";
  return isActive ? (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-danger hover:bg-red-50"
      disabled={pending}
      onClick={() => onDisable(u.id)}
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
      className="gap-1.5 text-emerald-700 hover:bg-emerald-50"
      disabled={pending}
      onClick={() => c.enable(u.id)}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" />
      )}
      {t("admin.users.actions.enable", { defaultValue: "Enable" })}
    </Button>
  );
}

/**
 * The actions cell for one user row: Disable/Enable (manager), Make manager
 * (HOD), Remove manager (HOD). Peer rows render a muted label instead of
 * actions, matching the backend 403.
 */
function UserRowActions({
  c,
  u,
  onDisable,
  onGrant,
  onRevoke,
}: {
  c: ManagedUsersController;
  u: UserWithRoles;
  onDisable: (userId: string) => void;
  onGrant: (u: UserWithRoles) => void;
  onRevoke: (u: UserWithRoles) => void;
}) {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const cap = rowCapabilities(c, u, me?.id);
  const pending =
    c.pendingUserId === u.id || c.grantPending || c.revokePending;

  if (!cap.canDisable && !cap.canGrant && !cap.canRevoke) {
    return cap.isPeer && !cap.isSelf && c.canManage ? (
      <span className="text-[11px] text-text-muted italic">
        {t("management_users.peer_row", { defaultValue: "Peer account" })}
      </span>
    ) : null;
  }

  return (
    <div className="flex justify-end gap-1.5">
      {cap.canGrant && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-m3-primary hover:bg-violet-50"
          disabled={pending}
          onClick={() => onGrant(u)}
        >
          {c.grantPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShieldPlus className="h-3.5 w-3.5" />
          )}
          {t("management_users.make_manager", {
            defaultValue: "Make manager",
          })}
        </Button>
      )}
      {cap.canRevoke && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-amber-700 hover:bg-amber-50"
          disabled={pending}
          onClick={() => onRevoke(u)}
        >
          {c.revokePending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserMinus className="h-3.5 w-3.5" />
          )}
          {t("management_users.remove_manager", {
            defaultValue: "Remove manager",
          })}
        </Button>
      )}
      {cap.canDisable && (
        <DisableEnableButton c={c} u={u} pending={pending} onDisable={onDisable} />
      )}
    </div>
  );
}

/** Confirm dialog for the HOD grant/revoke manager actions. */
function RoleActionDialog({
  c,
  action,
  onClose,
}: {
  c: ManagedUsersController;
  action: RoleAction;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isGrant = action.kind === "grant";
  const confirm = () => {
    if (isGrant) {
      c.grantManager(action.userId, action.orgId);
      toast.success(
        t("management_users.grant_toast", {
          defaultValue: "{{name}} is now a manager",
          name: action.displayName,
        }),
      );
    } else {
      c.revokeManager(action.userId, action.orgId);
      toast.success(
        t("management_users.revoke_toast", {
          defaultValue: "Manager role removed from {{name}}",
          name: action.displayName,
        }),
      );
    }
    onClose();
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        isGrant
          ? t("management_users.grant_dialog_title", {
              defaultValue: "Make manager?",
            })
          : t("management_users.revoke_dialog_title", {
              defaultValue: "Remove manager?",
            })
      }
      description={
        isGrant
          ? t("management_users.grant_dialog_body", {
              defaultValue:
                "{{name}} will gain the manager role in your organization and be able to manage teachers, students and courses.",
              name: action.displayName,
            })
          : t("management_users.revoke_dialog_body", {
              defaultValue:
                "{{name}} will lose the manager role in your organization. Their account stays active.",
              name: action.displayName,
            })
      }
      confirmLabel={
        isGrant
          ? t("management_users.make_manager", {
              defaultValue: "Make manager",
            })
          : t("management_users.remove_manager", {
              defaultValue: "Remove manager",
            })
      }
      cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
      confirmVariant={isGrant ? "default" : "destructive"}
      isPending={c.grantPending || c.revokePending}
      onConfirm={confirm}
    />
  );
}

/**
 * Manager users DataTable. Shares the column definitions with the admin
 * users table (avatar, role badges, status, org, joined) and appends an
 * actions column: Disable / Enable for teacher + student rows only.
 *
 * Peer rows (anyone holding manager / hod / admin at this org) and the
 * caller's own row render no action — matching the backend's
 * ``_assert_can_manage_user`` 403 rather than just dimming the button.
 *
 * HODs additionally get Make manager / Remove manager on their org rows:
 * a teacher/student can be promoted to manager, and a manager can be
 * demoted — but hod/admin rows stay admin-protected (backend 403).
 */
export function ManagedUsersTable({ c }: { c: ManagedUsersController }) {
  const { t } = useTranslation();
  const { table, columns } = c;
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const [roleAction, setRoleAction] = useState<RoleAction | null>(null);

  const actionsColumn: (typeof columns)[number] = {
    id: "actions",
    header: t("admin.users.cols.actions", { defaultValue: "Actions" }),
    align: "right",
    cell: (u) => (
      <UserRowActions
        c={c}
        u={u}
        onDisable={setConfirmTarget}
        onGrant={(row) =>
          setRoleAction({
            kind: "grant",
            userId: row.id,
            orgId: row.organization_id!,
            displayName: rowDisplayName(row),
          })
        }
        onRevoke={(row) =>
          setRoleAction({
            kind: "revoke",
            userId: row.id,
            orgId: row.organization_id!,
            displayName: rowDisplayName(row),
          })
        }
      />
    ),
  };

  const confirmUser = confirmTarget
    ? table.rows.find((u) => u.id === confirmTarget) ?? null
    : null;

  const roleActionUser = roleAction
    ? table.rows.find((u) => u.id === roleAction.userId) ?? null
    : null;

  return (
    <>
      <DataTable
        columns={[...columns, actionsColumn]}
        data={table.rows}
        getRowId={(u) => u.id}
        loading={table.isLoading}
        pagination
        manualPagination
        manualSorting
        rowCount={table.total}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        pageSizeOptions={[25, 50, 100]}
        sort={table.sort}
        onSortChange={table.setSort}
        emptyState={
          table.search || table.roleFilter
            ? t("admin.users.empty_search", {
                defaultValue: "No matching users",
              })
            : t("admin.users.empty_title", { defaultValue: "No users yet" })
        }
        toolbar={<ManagedUsersToolbar c={c} />}
      />

      {confirmUser && (
        <ConfirmDisableDialog
          isPending={c.pendingUserId === confirmUser.id}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => {
            c.disable(confirmUser.id);
            setConfirmTarget(null);
          }}
        />
      )}

      {roleAction && roleActionUser && (
        <RoleActionDialog
          c={c}
          action={roleAction}
          onClose={() => setRoleAction(null)}
        />
      )}
    </>
  );
}

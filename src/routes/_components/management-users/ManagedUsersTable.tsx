import { useState } from "react";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDisableDialog } from "@/routes/admin/_components/user-detail/ConfirmDisableDialog";

import { ManagedUsersToolbar } from "./ManagedUsersToolbar";
import type { ManagedUsersController } from "./use-managed-users";

/** Roles a manager may never disable / re-enable (backend enforces 403). */
const PEER_ROLE_CODES = new Set(["manager", "hod", "admin"]);

/**
 * Manager users DataTable. Shares the column definitions with the admin
 * users table (avatar, role badges, status, org, joined) and appends an
 * actions column: Disable / Enable for teacher + student rows only.
 *
 * Peer rows (anyone holding manager / hod / admin at this org) and the
 * caller's own row render no action — matching the backend's
 * ``_assert_can_manage_user`` 403 rather than just dimming the button.
 */
export function ManagedUsersTable({ c }: { c: ManagedUsersController }) {
  const { t } = useTranslation();
  const { user: me } = useAuth();
  const { table, columns } = c;
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);

  const actionsColumn: (typeof columns)[number] = {
    id: "actions",
    header: t("admin.users.cols.actions", { defaultValue: "Actions" }),
    align: "right",
    cell: (u) => {
      const isSelf = me?.id === u.id;
      const isPeer = (u.roles ?? []).some((code) => PEER_ROLE_CODES.has(code));
      if (!c.canManage || isSelf || isPeer) {
        return isPeer && !isSelf && c.canManage ? (
          <span className="text-[11px] text-text-muted italic">
            {t("management_users.peer_row", { defaultValue: "Peer account" })}
          </span>
        ) : null;
      }
      const pending = c.pendingUserId === u.id;
      const isActive = u.status === "active" || u.status === "invited";
      return (
        <div className="flex justify-end gap-1.5">
          {isActive ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-danger hover:bg-red-50"
              disabled={pending}
              onClick={() => setConfirmTarget(u.id)}
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
          )}
        </div>
      );
    },
  };

  const confirmUser = confirmTarget
    ? table.rows.find((u) => u.id === confirmTarget) ?? null
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
    </>
  );
}

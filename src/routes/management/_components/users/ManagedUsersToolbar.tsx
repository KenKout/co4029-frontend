import { useState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";

import { AddUserDialog } from "@/routes/admin/_components/users/AddUserDialog";
import type { ManagedUsersController } from "./use-managed-users";

const ROLE_FILTER_ID = "role";

/**
 * Manager users toolbar: search box + role filter chip on the shared
 * DataTableToolbar, matching the admin users toolbar. Deliberately no
 * organization filter — the backend forces the caller's org server-side,
 * so there is nothing to pick. Role options come from the same seeded
 * catalog that drives the Role column labels.
 *
 * The Add user button (manager-with-`user.bulk_import` only, mirroring the
 * backend gate) opens the invite dialog in the trailing slot. The dialog
 * runs in forced-org mode: no Organization field at all — the account joins
 * the caller's own org, and only teacher/student roles are offered.
 */
export function ManagedUsersToolbar({ c }: { c: ManagedUsersController }) {
  const { t, table, roleOptions, inviteRoleOptions, canInvite } = c;
  const [addOpen, setAddOpen] = useState(false);

  const filterDefs: FilterDef[] = [
    {
      id: ROLE_FILTER_ID,
      label: t("admin.users.filter_role", { defaultValue: "Filter by role" }),
      allLabel: t("admin.users.filter_role_all", {
        defaultValue: "All roles",
      }),
      options: roleOptions.map((r) => ({ value: r.code, label: r.name })),
    },
  ];

  return (
    <>
      <DataTableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t("admin.users.search_placeholder", {
          defaultValue: "Search by name or email…",
        })}
        filters={filterDefs}
        filterValues={{ role: table.roleFilter }}
        onFilterChange={(filterId, value) => {
          if (filterId === ROLE_FILTER_ID) table.setRoleFilter(value);
        }}
        onResetAllFilters={() => table.setRoleFilter(undefined)}
        clearLabel={t("admin.users.clear_filters", {
          defaultValue: "Clear filters",
        })}
        trailing={
          canInvite ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t("admin.users.add_user", { defaultValue: "Add user" })}
            </Button>
          ) : undefined
        }
      />
      <AddUserDialog
        c={{
          createUser: c.createUser,
          createUserPending: c.createUserPending,
          roleOptions: inviteRoleOptions,
        }}
        hideOrg
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </>
  );
}
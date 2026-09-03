import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";

import { ManagedUsersTable } from "@/routes/management/_components/users/ManagedUsersTable";
import { useManagedUsers } from "@/routes/management/_components/users/use-managed-users";

/**
 * Org-scoped user administration for managers: see the managers, teachers
 * and students of the caller's organization, disable / re-enable accounts
 * that belong to the org.
 *
 * Same DataTable + toolbar as the admin users page; the org scope is forced
 * server-side (identity ``/users/search`` replaces the org param with the
 * caller's primary org for non-admin callers), so the manager never picks
 * an org — there is only theirs.
 */
export default function ManagementUsersPage() {
  const { t } = useTranslation();
  const c = useManagedUsers();

  if (c.permissionsLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <PageSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!c.canRead) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("management_users.title", { defaultValue: "Users" })}
        subtitle={t("management_users.subtitle", {
          defaultValue:
            "Accounts in your organization. You can invite new teachers and students, and disable or re-enable accounts — peer manager/HOD/admin accounts are protected.",
        })}
      />

      {/* Active org-unit scope, mirroring the courses worklist. */}
      {c.unitId ? (
        <div className="flex items-center gap-2 rounded-lg border border-m3-primary/30 bg-m3-primary-fixed/40 px-3 py-2">
          <span className="text-xs text-m3-on-surface-variant">
            {t("dept_courses.scope_label")}
          </span>
          <span className="text-sm font-semibold text-m3-primary">
            {t("management_org_units.scoped_unit")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 gap-1 text-xs"
            onClick={() =>
              void c.navigate({ to: "/management/users", search: {} })
            }
          >
            <X className="h-3.5 w-3.5" />
            {t("dept_courses.scope_clear")}
          </Button>
        </div>
      ) : null}

      {c.table.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.users.roles.errors.load_failed", {
              defaultValue: "Failed to load users.",
            })}
          </p>
        </div>
      ) : (
        <ManagedUsersTable c={c} />
      )}
    </div>
  );
}

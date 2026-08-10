import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";

import { ManagedUsersTable } from "@/routes/_components/management-users/ManagedUsersTable";
import { useManagedUsers } from "@/routes/_components/management-users/use-managed-users";

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
            "Accounts in your organization. You can disable or re-enable teachers and students — peer manager/HOD/admin accounts are protected.",
        })}
      />

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

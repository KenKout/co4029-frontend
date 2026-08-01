import { Skeleton } from "@/components/ui/skeleton";

import { UsersTable } from "./_components/users/UsersTable";
import { useAdminUsers } from "./_components/users/use-admin-users";

export default function AdminUsersPage() {
  const c = useAdminUsers();
  const { t, table } = c;

  if (c.permissionsLoading) {
    return (
      <div className="space-y-3 pb-12">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!c.canAdmin) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-headline font-bold text-text-strong">
          {t("admin.users.list_title")}
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {t("admin.users.list_subtitle", {
            defaultValue: "List of users within your permission scope.",
          })}
        </p>
      </div>

      {table.isError ? (
        <div className="bg-surface-elev border border-border rounded-lg p-5">
          <p className="text-sm text-danger">
            {t("admin.users.roles.errors.load_failed")}
          </p>
        </div>
      ) : (
        <UsersTable c={c} />
      )}
    </div>
  );
}

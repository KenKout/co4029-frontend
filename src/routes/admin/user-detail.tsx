import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";

import { ConfirmDisableDialog } from "./_components/user-detail/ConfirmDisableDialog";
import { UserDetailBody } from "./_components/user-detail/UserDetailBody";
import { useAdminUserDetail } from "./_components/user-detail/use-admin-user-detail";

export default function AdminUserDetailPage() {
  const c = useAdminUserDetail();
  const { t, displayName } = c;

  if (c.permissionsLoading) {
    return (
      <div className="space-y-3 pb-12">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!c.canAdmin) {
    return <PermissionDenied />;
  }

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("admin.users.title"), to: "/admin/users" },
          { label: displayName },
        ]}
      />

      <UserDetailBody c={c} />

      {c.confirmOpen ? (
        <ConfirmDisableDialog
          onConfirm={c.handleDisable}
          onCancel={() => c.setConfirmOpen(false)}
          isPending={c.disableIsPending}
        />
      ) : null}
    </div>
  );
}

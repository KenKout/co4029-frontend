import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";

import { ConfirmDisableDialog } from "./_components/user-detail/ConfirmDisableDialog";
import { UserDetailBody } from "./_components/user-detail/UserDetailBody";
import { useAdminUserDetail } from "./_components/user-detail/use-admin-user-detail";

export default function AdminUserDetailPage() {
  const c = useAdminUserDetail();
  const { t, displayName } = c;

  if (c.permissionsLoading || !c.canAdmin) {
    return (
      <div className="space-y-3 pb-12">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: t("sections.admin"), to: "/admin/stats" },
          { label: t("admin.users.title"), to: "/admin/users" },
          { label: displayName },
        ]}
      />
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin.users.back_to_list")}
      </Link>

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

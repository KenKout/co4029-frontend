import { useTranslation } from "react-i18next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { PermissionDenied } from "@/components/ui/permission-denied";

import { UserOverviewBody } from "./_components/user-detail/UserOverviewBody";
import { useManagerUserDetail } from "./_components/user-detail/use-manager-user-detail";

/**
 * Org-scoped user detail for managers / HODs: identity always; students
 * additionally get enrolled courses with progress, career-path enrolments
 * and the last active time; teachers get their assigned courses. Manager /
 * HOD / admin targets return identity only (the backend decides, and 404s
 * cross-org lookups).
 */
export default function ManagementUserDetailPage() {
  const { t } = useTranslation();
  const c = useManagerUserDetail();
  const displayName =
    c.data?.user.profile?.display_name?.trim() ||
    c.data?.user.primary_email ||
    t("management_users.detail.unknown", { defaultValue: "User" });

  if (c.permissionsLoading) {
    return (
      <div className="space-y-3 pb-12">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!c.canRead) {
    return <PermissionDenied />;
  }

  if (c.isLoading) {
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
          { label: t("management_users.title", { defaultValue: "Users" }), to: "/management/users" },
          { label: displayName },
        ]}
      />

      <UserOverviewBody c={c} />
    </div>
  );
}

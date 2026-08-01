import { Skeleton } from "@/components/ui/skeleton";

import { ActiveSessionsCard } from "./ActiveSessionsCard";
import { RoleAssignmentsSection } from "./RoleAssignmentsSection";
import { UserDetailHeader } from "./UserDetailHeader";
import { UserProfileCard } from "./UserProfileCard";
import { UserTimestampsGrid } from "./UserTimestampsGrid";
import type { UserDetailController } from "./use-admin-user-detail";

/** Error / loading / loaded switch for the user-detail body. */
export function UserDetailBody({ c }: { c: UserDetailController }) {
  const { t, locale, detail, data, user } = c;

  if (detail.isError) {
    return (
      <div className="bg-surface-elev border border-border rounded-lg p-5">
        <p className="text-sm text-danger">
          {t("admin.users.roles.errors.load_failed")}
        </p>
      </div>
    );
  }

  if (detail.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  if (!user || !data) return null;

  return (
    <>
      <UserDetailHeader c={c} user={user} />

      <UserTimestampsGrid t={t} locale={locale} user={user} />

      {user.profile ? <UserProfileCard t={t} profile={user.profile} /> : null}

      <RoleAssignmentsSection
        userId={user.id}
        assignments={data.role_assignments}
      />

      {data.active_sessions.length > 0 ? (
        <ActiveSessionsCard
          t={t}
          locale={locale}
          sessions={data.active_sessions}
        />
      ) : null}
    </>
  );
}

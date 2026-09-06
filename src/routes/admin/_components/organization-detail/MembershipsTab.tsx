import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { MembershipList } from "./MembershipList";
import { useMembershipsTab } from "./use-memberships-tab";

export function MembershipsTab({ orgId }: { orgId: string }) {
  const controller = useMembershipsTab(orgId);
  const { t, members, isLoading } = controller;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (members ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          message={t("admin.organizations.empty.memberships")}
        />
      ) : (
        <MembershipList c={controller} />
      )}
    </div>
  );
}

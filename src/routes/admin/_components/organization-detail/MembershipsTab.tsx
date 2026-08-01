import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { MembershipAddForm } from "./MembershipAddForm";
import { MembershipBulkForm } from "./MembershipBulkForm";
import { MembershipList } from "./MembershipList";
import { MembershipModeToolbar } from "./MembershipModeToolbar";
import { useMembershipsTab } from "./use-memberships-tab";

export function MembershipsTab({ orgId }: { orgId: string }) {
  const controller = useMembershipsTab(orgId);
  const { t, members, isLoading, mode } = controller;

  return (
    <div className="space-y-4">
      <MembershipModeToolbar controller={controller} />

      {mode === "add" && <MembershipAddForm controller={controller} />}

      {mode === "bulk" && <MembershipBulkForm controller={controller} />}

      {isLoading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (members ?? []).length === 0 ? (
        <EmptyState
          icon={Users}
          message={t("admin.organizations.empty.memberships")}
        />
      ) : (
        <MembershipList members={members ?? []} orgId={orgId} />
      )}
    </div>
  );
}

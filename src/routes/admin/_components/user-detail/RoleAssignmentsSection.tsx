import type { RoleAssignmentRead } from "@/lib/api/types";

import { AssignmentList } from "./AssignmentList";
import { GrantRoleForm } from "./GrantRoleForm";
import { useRoleAssignments } from "./use-role-assignments";

export function RoleAssignmentsSection({
  userId,
  assignments,
}: {
  userId: string;
  assignments: RoleAssignmentRead[];
}) {
  const c = useRoleAssignments(userId, assignments);

  return (
    <div className="bg-surface-elev border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-headline font-bold text-text-strong">
          {c.t("admin.users.roles.title")}
        </h2>
        <span className="text-xs text-text-muted">
          {c.t("admin.users.roles.count", { count: assignments.length })}
        </span>
      </div>

      <AssignmentList c={c} />

      <GrantRoleForm c={c} />
      {c.confirmDialog}
    </div>
  );
}

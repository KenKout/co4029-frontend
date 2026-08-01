import { AssignmentRow } from "./AssignmentRow";
import { assignmentIdOf } from "./helpers";
import type { EnrichedAssignment, RoleAssignmentsController } from "./types";

export function AssignmentList({ c }: { c: RoleAssignmentsController }) {
  const { t, assignments } = c;

  if (assignments.length === 0) {
    return (
      <p className="text-sm text-text-muted py-4 text-center">
        {t("admin.users.roles.empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {(assignments as EnrichedAssignment[]).map((a) => (
        <AssignmentRow key={assignmentIdOf(a)} c={c} a={a} />
      ))}
    </ul>
  );
}

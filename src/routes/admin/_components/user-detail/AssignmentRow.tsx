import { Trash2 } from "lucide-react";

import {
  assignmentIdOf,
  assignmentRoleName,
  assignmentScopeTarget,
} from "./helpers";
import type { EnrichedAssignment, RoleAssignmentsController } from "./types";

export function AssignmentRow({
  c,
  a,
}: {
  c: RoleAssignmentsController;
  a: EnrichedAssignment;
}) {
  const { t, roleOptions, roleByCode, revokeIsPending, handleRevoke } = c;
  const assignmentId = assignmentIdOf(a);
  const roleName = assignmentRoleName(a, roleOptions, roleByCode);
  const scopeLabel = t(`admin.users.roles.scope_${a.scope_kind}`, {
    defaultValue: a.scope_kind,
  });
  const scopeTarget = assignmentScopeTarget(a);

  return (
    <li className="py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-strong">{roleName}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {scopeLabel}
          {scopeTarget ? (
            <>
              {" · "}
              <span className="font-medium text-text-strong">
                {scopeTarget}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          handleRevoke(assignmentId, roleName);
        }}
        disabled={revokeIsPending}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {t("admin.users.roles.revoke")}
      </button>
    </li>
  );
}

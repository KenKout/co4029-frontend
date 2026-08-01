import type { RoleAssignmentRead, RoleRead } from "@/lib/api/types";

import type { UserDetailController } from "./use-admin-user-detail";

/**
 * Shared types for the admin user-detail page, extracted from the former
 * 285-pure-LOC `RoleAssignmentsSection` / `AdminUserDetailPage` pair.
 */

// Localised copy lookup, typed as a plain call signature so helpers can accept
// it without importing i18next's generics.
export type TFn = (key: string, opts?: Record<string, unknown>) => string;

export type AdminUserDetailData = NonNullable<UserDetailController["data"]>;

export type AdminUserRecord = NonNullable<AdminUserDetailData["user"]>;

// The backend admin user-detail endpoint enriches each assignment with
// human-readable labels (role/org/unit/course names) after the committed
// OpenAPI snapshot. Widen the generated type locally so the UI can show names
// instead of raw UUIDs, falling back to the id when a label is absent.
export type EnrichedAssignment = RoleAssignmentRead & {
  role_code?: string | null;
  role_name?: string | null;
  organization_name?: string | null;
  org_unit_name?: string | null;
  course_title?: string | null;
  assignment_id?: string;
};

/** Everything the role-assignment section and its sub-parts need. */
export interface RoleAssignmentsController {
  t: TFn;
  assignments: RoleAssignmentRead[];
  roleOptions: RoleRead[];
  roleByCode: Record<string, string>;
  orgOptions: { id: string; name: string }[];
  orgUnitOptions: { id: string; name: string }[];
  roleCode: string;
  setRoleCode: (next: string) => void;
  scopeKind: string;
  setScopeKind: (next: string) => void;
  organizationId: string;
  setOrganizationId: (next: string) => void;
  orgUnitId: string;
  setOrgUnitId: (next: string) => void;
  courseId: string;
  setCourseId: (next: string) => void;
  isGrantValid: boolean;
  grantIsPending: boolean;
  revokeIsPending: boolean;
  handleGrant: (e: React.FormEvent<HTMLFormElement>) => void;
  handleRevoke: (assignmentId: string, roleName: string) => void;
  confirmDialog: React.ReactNode;
}

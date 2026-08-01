import type { User } from "@/lib/api/types";

/**
 * Shared types for the admin users list, extracted from the former
 * 213-pure-LOC `AdminUsersPage`.
 */

export type TFn = (key: string, opts?: Record<string, unknown>) => string;

// The backend UserRead gained roles[] + organization fields after the
// committed OpenAPI snapshot, so widen the generated type locally rather than
// reading untyped properties. Mirrors the use-server-table.ts note.
export type UserWithRoles = User & {
  roles?: string[];
  organization_id?: string | null;
  organization_name?: string | null;
};

/** Role codes that have a destination in the authenticated shell. */
export const ROLE_SWITCHER_ROLES = [
  "student",
  "teacher",
  "manager",
  "hod",
  "admin",
] as const;

export type RoleSwitcherRole = (typeof ROLE_SWITCHER_ROLES)[number];

/**
 * Return only the role-backed switcher entries, in a stable UI order.
 *
 * The backend may return assignments in scope/query order, so the response
 * order must not decide how the top bar is laid out. A user with multiple
 * assignments gets one entry per actual role; permissions are deliberately not
 * used here because they overlap (manager includes teacher capabilities).
 */
export function rolesForSwitcher(
  roles: readonly string[],
): RoleSwitcherRole[] {
  return ROLE_SWITCHER_ROLES.filter((role) => roles.includes(role));
}

/** Role codes that have a destination in the authenticated shell. */
export const ROLE_SWITCHER_ROLES = [
  "student",
  "teacher",
  "manager",
  "hod",
  "admin",
] as const;

export type RoleSwitcherRole = (typeof ROLE_SWITCHER_ROLES)[number];

/** URL families owned by each role switcher entry. */
export const ROLE_SWITCHER_PATH_PREFIXES: Record<
  RoleSwitcherRole,
  readonly string[]
> = {
  student: ["/dashboard", "/courses", "/me"],
  teacher: ["/teacher"],
  manager: ["/management"],
  hod: ["/management"],
  admin: ["/admin"],
};

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

/** Resolve the selected switcher entry from the current route family. */
export function roleForSwitcherPath(
  pathname: string,
  visibleRoles: readonly RoleSwitcherRole[],
): RoleSwitcherRole | undefined {
  return visibleRoles.find((role) =>
    ROLE_SWITCHER_PATH_PREFIXES[role].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
  );
}

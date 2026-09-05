/**
 * Where a signed-in user belongs by default.
 *
 * Every role used to land on ``/dashboard``, which is the STUDENT dashboard —
 * my-courses carousel, spaced-repetition summary, notifications. Correct for a
 * student and wrong for everyone else: a manager's first screen was a list of
 * courses they are not enrolled in.
 *
 * ROLE, not permission. The obvious implementation reuses the permission
 * predicates that gate the sidebar sections, but those overlap by design — a
 * manager holds ``course.create`` (so they satisfy the teacher predicate) and a
 * dean holds every manager permission. Landing needs a total order, so it reads
 * role CODES from ``/me/roles`` and takes the highest.
 *
 * Precedence, highest first: admin > hod (Faculty Dean) > manager > teacher >
 * student. Dean outranks manager because the dean role is a strict superset
 * (22 manager permissions plus ``learning_program.switch.review``,
 * ``user.role_assign.hod`` and ``progress.read.cohort``), so a dean landing on
 * the manager page would be missing their own review queue.
 *
 * Both roles land on the SAME page: ``/management`` renders the dean's
 * path-change queue only when the payload says
 * ``can_review_path_changes``, so one route serves both without a second copy.
 */

/** Role codes, most privileged first. Mirrors the `roles` table. */
export const ROLE_PRECEDENCE = [
  "admin",
  "hod",
  "manager",
  "teacher",
  "student",
] as const;

export type KnownRole = (typeof ROLE_PRECEDENCE)[number];

/** Default landing path per role code. */
const ROLE_LANDING: Record<KnownRole, string> = {
  admin: "/admin/stats",
  hod: "/management",
  manager: "/management",
  teacher: "/teacher",
  student: "/dashboard",
};

/** The student dashboard — also the fallback for a user with no known role. */
export const DEFAULT_LANDING = "/dashboard";

/**
 * The highest-precedence role in `roles`, or `null` when none is recognised.
 *
 * Unknown codes are ignored rather than treated as privileged: a role added to
 * the backend before this table is updated must not silently outrank admin.
 */
export function highestRole(roles: readonly string[]): KnownRole | null {
  return ROLE_PRECEDENCE.find((role) => roles.includes(role)) ?? null;
}

/**
 * The default landing path for a set of role codes.
 *
 * Falls back to the student dashboard when `roles` is empty or holds nothing
 * recognised — every authenticated user can see that page, so the fallback can
 * never strand someone on a 403.
 */
export function landingPathForRoles(roles: readonly string[]): string {
  const role = highestRole(roles);
  return role ? ROLE_LANDING[role] : DEFAULT_LANDING;
}

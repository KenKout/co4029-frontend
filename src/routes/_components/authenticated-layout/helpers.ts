import { hasAnyPermission } from "@/lib/auth/use-permissions";
import {
  adminNavGroups,
  managerNavGroups,
  studentNavGroups,
  teacherNavGroups,
} from "@/lib/navigation";
import {
  ADMIN_PERMS,
  ADMIN_PREFIXES,
  MANAGER_PERMS,
  MANAGER_PREFIXES,
  STUDENT_PREFIXES,
  TEACHER_PREFIXES,
  TEACHER_PERMS,
} from "./constants";
import type {
  AccessInputs,
  AllowedSection,
  LayoutRole,
  NavGroups,
  SectionFlags,
} from "./types";

/** Does `pathname` sit under any of `prefixes`? */
export function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname.startsWith(p));
}

/** Which privileged URL family the pathname belongs to, plus whether any does. */
export function resolveSectionFlags(
  pathname: string,
): SectionFlags & { needsCheck: boolean } {
  const onAdminPath = matchesPrefix(pathname, ADMIN_PREFIXES);
  const onManagerPath = matchesPrefix(pathname, MANAGER_PREFIXES);
  const onTeacherPath = matchesPrefix(pathname, TEACHER_PREFIXES);
  const onStudentPath = matchesPrefix(pathname, STUDENT_PREFIXES);
  const needsCheck = onAdminPath || onManagerPath || onTeacherPath;
  return {
    onAdminPath,
    onManagerPath,
    onTeacherPath,
    onStudentPath,
    needsCheck,
  };
}

/**
 * Wait for both effective permissions and explicit role assignments before
 * deciding access. A higher role's broad permission set must not grant a
 * section the user was not assigned (for example, admin without teacher).
 */
export function resolveIsAllowed({
  needsCheck,
  permsReady,
  perms,
  rolesReady,
  roles,
  onAdminPath,
  onManagerPath,
  onTeacherPath,
}: AccessInputs): boolean {
  return (
    !needsCheck ||
    (permsReady &&
      rolesReady &&
      ((onAdminPath &&
        roles.includes("admin") &&
        hasAnyPermission(perms, ADMIN_PERMS)) ||
        (onManagerPath &&
          (roles.includes("manager") || roles.includes("hod")) &&
          hasAnyPermission(perms, MANAGER_PERMS)) ||
        (onTeacherPath &&
          roles.includes("teacher") &&
          hasAnyPermission(perms, TEACHER_PERMS))))
  );
}

/**
 * Resolve the sidebar context for routes shared by every signed-in user.
 *
 * Shared pages do not carry a role prefix, so treating "no prefix" as
 * student made the notification inbox replace an admin/manager/teacher
 * sidebar with the student navigation. Role assignments are the source of
 * truth for the default context; permissions remain a fallback while roles
 * are unavailable. Manager must remain ahead of teacher because manager
 * permissions intentionally overlap the teacher set.
 */
export function resolveDefaultRole(
  roles: readonly string[],
  perms: readonly string[],
): LayoutRole {
  return roles.includes("admin") || hasAnyPermission(perms, ADMIN_PERMS)
    ? "admin"
    : roles.includes("hod") ||
        roles.includes("manager") ||
        hasAnyPermission(perms, MANAGER_PERMS)
      ? "manager"
      : roles.includes("teacher") || hasAnyPermission(perms, TEACHER_PERMS)
        ? "teacher"
        : "student";
}

/**
 * Pick nav items based on the allowed URL family and assigned role, not just
 * the highest permission. Manager is checked before teacher because a manager
 * holds course.create too (so would otherwise match the teacher section).
 */
export function resolveNavGroups({
  isAllowed,
  onAdminPath,
  onManagerPath,
  onTeacherPath,
  onStudentPath,
  roles,
  defaultRole,
}: AllowedSection): NavGroups {
  return isAllowed && onAdminPath
    ? adminNavGroups
    : isAllowed && onManagerPath
      ? managerNavGroups
      : isAllowed && onTeacherPath
        ? teacherNavGroups
        : isAllowed && onStudentPath && roles.includes("student")
          ? studentNavGroups
          : defaultRole === "admin"
          ? adminNavGroups
          : defaultRole === "manager"
            ? managerNavGroups
            : defaultRole === "teacher"
              ? teacherNavGroups
              : studentNavGroups;
}

/** The role label handed to AppShell — same precedence as `resolveNavGroups`. */
export function resolveRole({
  isAllowed,
  onAdminPath,
  onManagerPath,
  onTeacherPath,
  onStudentPath,
  roles,
  defaultRole,
}: AllowedSection): LayoutRole {
  return isAllowed && onAdminPath
    ? ("admin" as const)
    : isAllowed && onManagerPath
      ? ("manager" as const)
      : isAllowed && onTeacherPath
        ? ("teacher" as const)
        : isAllowed && onStudentPath && roles.includes("student")
          ? ("student" as const)
          : defaultRole;
}

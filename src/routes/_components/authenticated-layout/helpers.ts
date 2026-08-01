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
  const needsCheck = onAdminPath || onManagerPath || onTeacherPath;
  return { onAdminPath, onManagerPath, onTeacherPath, needsCheck };
}

/**
 * Wait for the permission query to settle before deciding access. While
 * loading we treat privileged paths as blocked to avoid flashing a
 * privileged sidebar to a student who happens to be in the middle of a check.
 */
export function resolveIsAllowed({
  needsCheck,
  permsReady,
  perms,
  onAdminPath,
  onManagerPath,
  onTeacherPath,
}: AccessInputs): boolean {
  return (
    !needsCheck ||
    (permsReady &&
      ((onAdminPath && hasAnyPermission(perms, ADMIN_PERMS)) ||
        (onManagerPath && hasAnyPermission(perms, MANAGER_PERMS)) ||
        (onTeacherPath && hasAnyPermission(perms, TEACHER_PERMS))))
  );
}

/**
 * Pick nav items based on permission, not just URL — a student who
 * somehow lands on /admin/* should see the student sidebar while the
 * redirect is in flight. Manager is checked before teacher because a manager
 * holds course.create too (so would otherwise match the teacher section).
 */
export function resolveNavGroups({
  isAllowed,
  onAdminPath,
  onManagerPath,
  onTeacherPath,
}: AllowedSection): NavGroups {
  return isAllowed && onAdminPath
    ? adminNavGroups
    : isAllowed && onManagerPath
      ? managerNavGroups
      : isAllowed && onTeacherPath
        ? teacherNavGroups
        : studentNavGroups;
}

/** The role label handed to AppShell — same precedence as `resolveNavGroups`. */
export function resolveRole({
  isAllowed,
  onAdminPath,
  onManagerPath,
  onTeacherPath,
}: AllowedSection): LayoutRole {
  return isAllowed && onAdminPath
    ? ("admin" as const)
    : isAllowed && onManagerPath
      ? ("manager" as const)
      : isAllowed && onTeacherPath
        ? ("teacher" as const)
        : ("student" as const);
}

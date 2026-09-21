import { useLocation } from "@tanstack/react-router";
import { useMyRoles } from "@/lib/api/hooks/admin";
import { usePermissions } from "@/lib/auth/use-permissions";
import { DESKTOP_FIRST_PREFIXES } from "./constants";
import {
  matchesPrefix,
  resolveDefaultRole,
  resolveIsAllowed,
  resolveNavGroups,
  resolveRole,
  resolveSectionFlags,
} from "./helpers";
import type { RouteAccess } from "./types";

/**
 * The whole authenticated-route guard: decides whether the current pathname is
 * reachable, redirects when it is not, and reports which sidebar/role the
 * shell should render meanwhile.
 *
 * Hook order here is exactly the order the former inline component used
 * (useLocation → useNavigate → usePermissions → useMyRoles → useEffect); the layout wraps
 * every authenticated route, so a reordering would change mount behaviour for
 * the entire signed-in app.
 */
export function useRouteAccess(): RouteAccess {
  const location = useLocation();
  const permissions = usePermissions();
  const roles = useMyRoles();
  const perms = permissions.permissions;

  const {
    onAdminPath,
    onManagerPath,
    onTeacherPath,
    onStudentPath,
    needsCheck,
  } = resolveSectionFlags(location.pathname);

  const permsReady = !permissions.isLoading;
  const rolesReady = !roles.isLoading;
  const roleCodes = roles.data ?? [];
  const isAllowed = resolveIsAllowed({
    needsCheck,
    permsReady,
    perms,
    rolesReady,
    roles: roleCodes,
    onAdminPath,
    onManagerPath,
    onTeacherPath,
    onStudentPath,
  });

  const defaultRole = resolveDefaultRole(roleCodes, perms);
  const section = {
    isAllowed,
    onAdminPath,
    onManagerPath,
    onTeacherPath,
    onStudentPath,
    roles: roleCodes,
    defaultRole,
  };
  const navGroups = resolveNavGroups(section);
  const role = resolveRole(section);

  const showDesktopBanner = matchesPrefix(
    location.pathname,
    DESKTOP_FIRST_PREFIXES,
  );

  // Spinner only while the permission or role lookup is still in flight. Once
  // both have settled, a denied section URL renders <PermissionDenied /> in
  // place — no redirect, so the browser stays on the address they hit.
  const showGuardedSpinner = needsCheck && (!permsReady || !rolesReady);
  const denied = needsCheck && permsReady && !isAllowed;

  return { navGroups, role, showDesktopBanner, showGuardedSpinner, denied, permsReady };
}

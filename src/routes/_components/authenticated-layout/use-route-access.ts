import { useLocation } from "@tanstack/react-router";
import { usePermissions } from "@/lib/auth/use-permissions";
import { DESKTOP_FIRST_PREFIXES } from "./constants";
import {
  matchesPrefix,
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
 * (useLocation → useNavigate → usePermissions → useEffect); the layout wraps
 * every authenticated route, so a reordering would change mount behaviour for
 * the entire signed-in app.
 */
export function useRouteAccess(): RouteAccess {
  const location = useLocation();
  const permissions = usePermissions();
  const perms = permissions.permissions;

  const { onAdminPath, onManagerPath, onTeacherPath, needsCheck } =
    resolveSectionFlags(location.pathname);

  const permsReady = !permissions.isLoading;
  const isAllowed = resolveIsAllowed({
    needsCheck,
    permsReady,
    perms,
    onAdminPath,
    onManagerPath,
    onTeacherPath,
  });

  const section = { isAllowed, onAdminPath, onManagerPath, onTeacherPath };
  const navGroups = resolveNavGroups(section);
  const role = resolveRole(section);

  const showDesktopBanner = matchesPrefix(
    location.pathname,
    DESKTOP_FIRST_PREFIXES,
  );

  // Spinner only while the permission lookup is still in flight. Once it has
  // settled, a denied section URL renders <PermissionDenied /> in place — no
  // redirect, so the browser stays on the address the user actually hit.
  const showGuardedSpinner = needsCheck && !permsReady;
  const denied = needsCheck && permsReady && !isAllowed;

  return { navGroups, role, showDesktopBanner, showGuardedSpinner, denied, permsReady };
}

import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
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
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!needsCheck) return;
    if (!permsReady) return;
    if (isAllowed) return;

    toast.error("Bạn không có quyền truy cập trang này.");
    void navigate({ to: "/dashboard", replace: true });
  }, [needsCheck, permsReady, isAllowed, navigate]);

  const section = { isAllowed, onAdminPath, onManagerPath, onTeacherPath };
  const navGroups = resolveNavGroups(section);
  const role = resolveRole(section);

  const showDesktopBanner = matchesPrefix(
    location.pathname,
    DESKTOP_FIRST_PREFIXES,
  );

  const showGuardedSpinner = needsCheck && !isAllowed;

  return { navGroups, role, showDesktopBanner, showGuardedSpinner, permsReady };
}

import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMyPermissions } from "@/lib/api/hooks/auth";

/**
 * Permission helpers — the single source of truth for "does the current user
 * hold permission X?" checks in the UI.
 *
 * Before this hook every gated screen repeated the same boilerplate:
 *
 *     const permissions = useMyPermissions();
 *     const perms = permissions.data?.permissions ?? [];
 *     const canFoo = perms.includes("foo") || perms.includes("system.administer");
 *
 * with subtly different shapes (some used `?? false`, some read
 * `permissions.data?.permissions.includes(...)` inline, some destructured to a
 * `perms` array first). Centralising the data access + the check logic here
 * removes that drift and handles the loading state once.
 *
 * NOTE: these checkers are LITERAL — they do not implicitly grant the
 * `system.administer` superuser permission. Call sites that want the superuser
 * to also pass must list it explicitly, e.g. `hasAny("course.create",
 * SUPERUSER_PERMISSION)`. This keeps the refactor behaviour-preserving: a page
 * that previously checked only `course.create` still checks only that.
 */

/** The platform superuser permission. Pass explicitly where a bypass is wanted. */
export const SUPERUSER_PERMISSION = "system.administer";

/** Pure check: does `perms` hold `required`? */
export function hasPermission(
  perms: readonly string[],
  required: string,
): boolean {
  return perms.includes(required);
}

/** Pure check: does `perms` hold ANY of `required`? */
export function hasAnyPermission(
  perms: readonly string[],
  required: readonly string[],
): boolean {
  return required.some((p) => perms.includes(p));
}

/** Pure check: does `perms` hold ALL of `required`? */
export function hasAllPermissions(
  perms: readonly string[],
  required: readonly string[],
): boolean {
  return required.every((p) => perms.includes(p));
}

export interface UsePermissionsResult {
  /** The current user's raw permission slugs (empty until loaded). */
  permissions: string[];
  /** True while the permission query is still in flight. */
  isLoading: boolean;
  /** True once the query has settled (success or error). */
  isReady: boolean;
  /** Holds `perm`. */
  has: (perm: string) => boolean;
  /** Holds at least one of `perms`. */
  hasAny: (...perms: string[]) => boolean;
  /** Holds every one of `perms`. */
  hasAll: (...perms: string[]) => boolean;
}

/**
 * Read the current user's permissions plus bound `has` / `hasAny` / `hasAll`
 * checkers.
 *
 * ```ts
 * const { has, hasAny, isLoading } = usePermissions();
 * const canCreate = has("course.create");
 * const canManageOrg = hasAny("org_unit.manage", "user.bulk_import");
 * ```
 */
export function usePermissions(): UsePermissionsResult {
  const query = useMyPermissions();
  const permissions = useMemo(
    () => query.data?.permissions ?? [],
    [query.data],
  );

  return useMemo(
    () => ({
      permissions,
      isLoading: query.isLoading,
      isReady: !query.isLoading,
      has: (perm: string) => permissions.includes(perm),
      hasAny: (...perms: string[]) => hasAnyPermission(permissions, perms),
      hasAll: (...perms: string[]) => hasAllPermissions(permissions, perms),
    }),
    [permissions, query.isLoading],
  );
}

/** Convenience: boolean for a single permission. */
export function useHasPermission(perm: string): boolean {
  return usePermissions().has(perm);
}

/** Convenience: boolean for "holds any of these". */
export function useHasAnyPermission(...perms: string[]): boolean {
  return usePermissions().hasAny(...perms);
}

export interface UseRequirePermissionResult {
  /** True while permissions are still loading — render your loading UI. */
  isLoading: boolean;
  /** True once loaded AND the user is allowed — safe to render the page. */
  allowed: boolean;
}

/**
 * Route guard: redirect away (with a toast) when the current user lacks access.
 *
 * Replaces the block that was copy-pasted across ~15 gated pages:
 *
 * ```ts
 * useEffect(() => {
 *   if (permissions.isLoading) return;
 *   if (!canAdmin) {
 *     toast.error(t("…no_permission"));
 *     void navigate({ to: "/dashboard", replace: true });
 *   }
 * }, [permissions.isLoading, canAdmin, navigate, t]);
 * if (permissions.isLoading) return <Skeleton/>;
 * if (!canAdmin) return null;
 * ```
 *
 * Takes the ALREADY-COMPUTED `allowed` boolean (not a permission string) so
 * composed checks — `hasAny(...) || has(...)` — work unchanged. `messageKey`
 * is REQUIRED and lives at the call site, so each page owns its own i18n key
 * and it can't silently drift to another page's namespace (the copy-paste bug
 * this replaces: admin/courses was toasting the admin.users key).
 *
 * Returns `{ isLoading, allowed }`; the caller renders its own loading
 * placeholder and returns null when not allowed — those skeletons vary too much
 * to own here.
 *
 * ```tsx
 * const canAdmin = permissions.has("system.administer");
 * const guard = useRequirePermission(canAdmin, {
 *   messageKey: "admin.courses_list.errors.no_permission",
 * });
 * if (guard.isLoading) return <PageSkeleton rows={3} />;
 * if (!guard.allowed) return null;
 * ```
 */
export function useRequirePermission(
  allowed: boolean,
  options: {
    /** i18n key for the "no permission" toast. Required — keeps it explicit. */
    messageKey: string;
    /** Where to send a disallowed user. Defaults to "/dashboard". */
    redirectTo?: string;
  },
): UseRequirePermissionResult {
  const { messageKey, redirectTo = "/dashboard" } = options;
  const { isLoading } = usePermissions();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Guard against double-toasting. `t` changes identity when i18n swaps
  // language (AuthProvider hydrates the saved profile locale right after
  // mount), and `t` is a dependency below — so a disallowed page would fire
  // two toasts (one per locale) on first paint. The ref keeps the toast to
  // one per disallowed state; it resets when the user becomes allowed again.
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!allowed) {
      if (!hasNotifiedRef.current) {
        hasNotifiedRef.current = true;
        toast.error(t(messageKey));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void navigate({ to: redirectTo as any, replace: true });
    } else {
      hasNotifiedRef.current = false;
    }
  }, [isLoading, allowed, navigate, t, messageKey, redirectTo]);

  return { isLoading, allowed: !isLoading && allowed };
}

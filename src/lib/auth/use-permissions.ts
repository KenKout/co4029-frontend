import { useMemo } from "react";
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

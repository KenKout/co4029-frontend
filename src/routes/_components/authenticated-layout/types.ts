import type { NavGroup } from "@/lib/navigation";

/**
 * Shared types for the authenticated layout guard, extracted from
 * `authenticated-layout.tsx` so the prefix matching, the access decision and
 * the section resolution all agree on one shape instead of passing a dozen
 * loose booleans around.
 */

export type NavGroups = NavGroup[];

export type LayoutRole = "admin" | "manager" | "teacher" | "student";

/** Which privileged URL family the current pathname belongs to (if any). */
export interface SectionFlags {
  onAdminPath: boolean;
  onManagerPath: boolean;
  onTeacherPath: boolean;
}

/** Everything the access decision needs: the URL family plus query state. */
export interface AccessInputs extends SectionFlags {
  needsCheck: boolean;
  permsReady: boolean;
  perms: string[];
}

/** The URL family plus whether the user is cleared for it. */
export interface AllowedSection extends SectionFlags {
  isAllowed: boolean;
}

/** What the layout shell renders with, once the guard has decided. */
export interface RouteAccess {
  navGroups: NavGroups;
  role: LayoutRole;
  showDesktopBanner: boolean;
  showGuardedSpinner: boolean;
  permsReady: boolean;
}

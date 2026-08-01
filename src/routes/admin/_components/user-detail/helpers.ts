import type { RoleRead } from "@/lib/api/types";
import { formatDateTime, resolveLocale } from "@/lib/format/date";

import type { EnrichedAssignment, AdminUserRecord } from "./types";

/** `resolvedLanguage` wins; `language` is the raw setting, `en` the last resort. */
export function activeLanguage(
  resolvedLanguage: string | undefined,
  language: string | undefined,
): string {
  return resolvedLanguage ?? language ?? "en";
}

export function userDisplayName(user: AdminUserRecord | undefined): string {
  return user?.profile?.display_name?.trim() || user?.primary_email || "—";
}

/** Both statuses block sign-in, so the UI offers "enable" for either. */
export function isUserDisabled(user: AdminUserRecord | undefined): boolean {
  return user?.status === "disabled" || user?.status === "inactive";
}

// Thin wrapper over the shared date/time formatter; call sites pass the raw
// i18n language, resolveLocale maps it to BCP-47. Same short date+time output.
export function formatDate(
  iso: string | null | undefined,
  language: string,
): string {
  return formatDateTime(iso, resolveLocale(language));
}

/** The row key / revoke target: `id` when present, else the enriched alias. */
export function assignmentIdOf(a: EnrichedAssignment): string {
  return a.id ?? a.assignment_id ?? "";
}

/** Prefer server-resolved names; fall back to catalog lookup, then id. */
export function assignmentRoleName(
  a: EnrichedAssignment,
  roleOptions: RoleRead[],
  roleByCode: Record<string, string>,
): string {
  return (
    a.role_name ??
    roleOptions.find((r) => r.id === a.role_id)?.name ??
    roleByCode[a.role_id] ??
    a.role_code ??
    a.role_id
  );
}

/**
 * Scope description in plain language: "Organization · Acme" etc.,
 * mapping each scope FK to its resolved entity name (never a UUID).
 */
export function assignmentScopeTarget(
  a: EnrichedAssignment,
): string | null | undefined {
  return a.scope_kind === "organization"
    ? (a.organization_name ?? a.organization_id)
    : a.scope_kind === "org_unit"
      ? (a.org_unit_name ?? a.org_unit_id)
      : a.scope_kind === "course"
        ? (a.course_title ?? a.course_id)
        : null;
}

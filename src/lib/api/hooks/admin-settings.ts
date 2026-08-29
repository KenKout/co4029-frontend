/**
 * Runtime settings admin API.
 *
 * Two scopes share one row shape. A global row is fetched from
 * `/admin/settings`; an organization's overrides come from
 * `/admin/organizations/{orgId}/settings` and carry the same fields plus a
 * populated `org_value`. The server resolves precedence and reports it in
 * `source`, so the UI never re-implements the chain — it renders what the
 * backend says is in force.
 *
 * Writes go through preview -> apply, never straight through. The page used to
 * save on blur, which made reading the form and changing the deployment the
 * same gesture; every write now carries a reason and lands in an audit trail
 * that can be rolled back (PRD ADM-030 -> ADM-034).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiFetch, apiPost, apiPut } from "@/lib/api/client";

export type SettingSource =
  | "organization"
  | "global"
  | "environment"
  | "default";

export interface RuntimeSetting {
  key: string;
  group: string;
  type: "bool" | "int" | "float";
  label: string;
  description: string;
  env_var: string | null;
  minimum: number | null;
  maximum: number | null;
  requires_reprocess: boolean;
  default_value: boolean | number;
  env_value: boolean | number | null;
  global_value: boolean | number | null;
  org_value: boolean | number | null;
  effective_value: boolean | number;
  source: SettingSource;
}

/** `undefined` orgId means the deployment-wide defaults. */
function basePath(orgId?: string): string {
  return orgId ? `/admin/organizations/${orgId}/settings` : "/admin/settings";
}

function settingsKey(orgId?: string) {
  return ["admin", "settings", orgId ?? "global"] as const;
}

export function useRuntimeSettings(orgId?: string, enabled = true) {
  return useQuery({
    queryKey: settingsKey(orgId),
    queryFn: () => apiFetch<RuntimeSetting[]>(basePath(orgId)),
    enabled,
    staleTime: 1000 * 15,
  });
}

/** What applying a pending change would do. Returned by the preview call. */
export interface ChangeImpact {
  key: string;
  label: string;
  description: string;
  scope: "global" | "organization";
  organization_id: string | null;
  current_value: boolean | number | null;
  current_source: SettingSource;
  /** `null` means the override would be removed and inheritance resumes. */
  new_value: boolean | number | null;
  /** The edit is a no-op at this scope — same value already stored. */
  unchanged: boolean;
  /** Organizations a global change actually reaches (those without an
   *  override of their own). Always 1 for an org-scoped change. */
  affected_organizations: number;
  total_organizations: number;
  /** Applies to the NEXT ingest only; nothing already processed changes. */
  requires_reprocess: boolean;
}

/** One recorded change. Null values on either side are meaningful — see the
 *  backend migration: null before = inherited, null after = override removed. */
export interface SettingChange {
  id: string;
  setting_key: string;
  organization_id: string | null;
  organization_name: string | null;
  scope: "global" | "organization";
  action: "set" | "clear" | "rollback";
  before_value: boolean | number | null;
  after_value: boolean | number | null;
  reason: string;
  actor_id: string | null;
  actor_email: string | null;
  source: string;
  reverted_change_id: string | null;
  created_at: string;
}

export interface ApplyResult {
  setting: RuntimeSetting;
  change_id: string;
}

function changesKey(orgId?: string) {
  return ["admin", "settings", "changes", orgId ?? "global"] as const;
}

/**
 * Dry-run a pending edit: validates it server-side and reports its blast
 * radius without writing anything.
 *
 * A mutation rather than a query on purpose — it is an explicit step the
 * operator takes, not state that should refetch on focus or be served from
 * cache. A cached preview of a value someone else has since changed is exactly
 * the wrong thing to show before an apply.
 */
export function usePreviewRuntimeSetting(orgId?: string) {
  return useMutation({
    mutationFn: ({
      key,
      value,
      clear,
    }: {
      key: string;
      value?: boolean | number;
      clear?: boolean;
    }) =>
      apiPost<ChangeImpact>(`${basePath(orgId)}/${key}/preview`, {
        value: value ?? null,
        clear: clear ?? false,
      }),
  });
}

/**
 * Apply a change. `reason` is required by the API, not optional here —
 * omitting it is a 422, which is the point (PRD ADM-033).
 */
export function useApplyRuntimeSetting(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      value,
      reason,
    }: {
      key: string;
      value: boolean | number;
      reason: string;
    }) => apiPut<ApplyResult>(`${basePath(orgId)}/${key}`, { value, reason }),
    // Both scopes are invalidated: editing the global default changes the
    // effective value of every organization that has no override, so a stale
    // org view would show the old number as still in force.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

/** Remove an override so the next level down applies again. */
export function useClearRuntimeSetting(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, reason }: { key: string; reason: string }) =>
      // The reason travels in the query string: DELETE bodies are dropped by
      // enough proxies that requiring one would make the audit trail
      // unreliable in exactly the deployments that most need it.
      apiDelete<ApplyResult>(
        `${basePath(orgId)}/${key}?reason=${encodeURIComponent(reason)}`,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

/** Change history for this scope, newest first. */
export function useSettingChanges(
  orgId?: string,
  settingKey?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [...changesKey(orgId), settingKey ?? "all"] as const,
    queryFn: () => {
      const qs = settingKey
        ? `?setting_key=${encodeURIComponent(settingKey)}`
        : "";
      return apiFetch<SettingChange[]>(`${basePath(orgId)}/changes${qs}`);
    },
    enabled,
    staleTime: 1000 * 15,
  });
}

/** Restore the value a previous change replaced. Appends a new change. */
export function useRollbackSettingChange(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ changeId, reason }: { changeId: string; reason: string }) =>
      apiPost<ApplyResult>(`${basePath(orgId)}/changes/${changeId}/rollback`, {
        reason,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

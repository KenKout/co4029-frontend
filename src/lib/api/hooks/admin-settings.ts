/**
 * Runtime settings admin API.
 *
 * Two scopes share one row shape. A global row is fetched from
 * `/admin/settings`; an organization's overrides come from
 * `/admin/organizations/{orgId}/settings` and carry the same fields plus a
 * populated `org_value`. The server resolves precedence and reports it in
 * `source`, so the UI never re-implements the chain — it renders what the
 * backend says is in force.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiFetch, apiPut } from "@/lib/api/client";

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

export function useSetRuntimeSetting(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: boolean | number }) =>
      apiPut<RuntimeSetting>(`${basePath(orgId)}/${key}`, { value }),
    // Both scopes are invalidated: editing the global default changes the
    // effective value of every organization that has no override, so a stale
    // org view would show the old number as still in force.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

export function useClearRuntimeSetting(orgId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => apiDelete(`${basePath(orgId)}/${key}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });
}

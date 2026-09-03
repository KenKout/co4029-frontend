import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, apiPatch, apiPost, apiPut } from "../client";
import { queryKeys } from "../query-keys";

/**
 * Policy documents.
 *
 * These replaced five hardcoded `PolicyDocument` constants in
 * `lib/help-content.ts`. The reader-facing endpoints are deliberately
 * unauthenticated — the terms must be readable before an account exists — so
 * the hooks below never require a session.
 */

export type PolicyCategory = "legal" | "academic";
export type PolicyVersionStatus = "draft" | "published" | "archived";

export interface PolicySummary {
  slug: string;
  category: PolicyCategory;
  title: string;
  language: string;
  version_no: number;
  published_at: string;
}

export interface PolicyDocument extends PolicySummary {
  body: string;
  format: string;
  published_by_name: string | null;
  changelog: string | null;
}

export interface PolicyAudienceRole {
  role_id: string;
  code: string;
  name: string;
}

export interface PolicyVersionSummary {
  id: string;
  version_no: number;
  language: string;
  status: PolicyVersionStatus;
  title: string;
  changelog: string | null;
  published_at: string | null;
  published_by: string | null;
  updated_at: string;
}

/** A version WITH its body — what the authoring editor loads. */
export interface PolicyVersionRead extends PolicyVersionSummary {
  body: string;
  format: string;
}

export interface PolicyDetail {
  id: string;
  slug: string;
  category: PolicyCategory;
  audience: PolicyAudienceRole[];
  versions: PolicyVersionSummary[];
}

const DEFAULT_LANGUAGE = "en";

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------

/**
 * The policy index, narrowed to the reader's roles.
 *
 * `roles` widens a courtesy filter over public documents; it unlocks nothing,
 * which is why sending it from the client is safe. Signed out, pass `[]` and
 * the server returns only policies with no audience.
 */
export function usePolicies(roles: string[], language = DEFAULT_LANGUAGE) {
  return useQuery({
    queryKey: queryKeys.policies.list(roles, language),
    queryFn: () => {
      const params = new URLSearchParams();
      for (const role of roles) params.append("role", role);
      params.set("language", language);
      return apiFetch<PolicySummary[]>(`/policies?${params.toString()}`);
    },
  });
}

export function usePolicy(slug: string | undefined, language = DEFAULT_LANGUAGE) {
  return useQuery({
    queryKey: queryKeys.policies.bySlug(slug ?? "", language),
    queryFn: () =>
      apiFetch<PolicyDocument>(
        `/policies/${encodeURIComponent(slug!)}?language=${encodeURIComponent(language)}`,
      ),
    enabled: !!slug,
  });
}

// ---------------------------------------------------------------------------
// Admin authoring
// ---------------------------------------------------------------------------

export function useAdminPolicies() {
  return useQuery({
    queryKey: queryKeys.policies.adminList(),
    queryFn: () => apiFetch<PolicyDetail[]>("/admin/policies"),
  });
}

export function useAdminPolicy(policyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.policies.adminDetail(policyId ?? ""),
    queryFn: () => apiFetch<PolicyDetail>(`/admin/policies/${policyId!}`),
    enabled: !!policyId,
  });
}

/**
 * One version's full text.
 *
 * `useAdminPolicy` returns summaries only, so a policy with a long history
 * stays a small response; the editor asks separately for the single body it
 * is actually about to show.
 */
export function useAdminPolicyVersion(
  policyId: string | undefined,
  versionId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.policies.adminVersion(policyId ?? "", versionId ?? ""),
    queryFn: () =>
      apiFetch<PolicyVersionRead>(
        `/admin/policies/${policyId!}/versions/${versionId!}`,
      ),
    enabled: !!policyId && !!versionId,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      slug: string;
      category: PolicyCategory;
      title: string;
      language?: string;
    }) => apiPost<PolicyDetail>("/admin/policies", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.policies.adminList() });
    },
  });
}

export function useOpenPolicyDraft(policyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      language?: string;
      title?: string;
      body?: string;
      changelog?: string | null;
    }) =>
      apiPost<PolicyVersionSummary>(`/admin/policies/${policyId}/versions`, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.policies.adminDetail(policyId),
      });
    },
  });
}

export function useUpdatePolicyDraft(policyId: string, versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title?: string;
      body?: string;
      changelog?: string | null;
    }) =>
      apiPatch<PolicyVersionSummary>(
        `/admin/policies/${policyId}/versions/${versionId}`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.policies.adminDetail(policyId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.policies.adminVersion(policyId, versionId),
      });
    },
  });
}

export function usePublishPolicyVersion(policyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      apiPost<PolicyVersionSummary>(
        `/admin/policies/${policyId}/versions/${versionId}/publish`,
        {},
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.policies.adminDetail(policyId),
      });
      // The reader index, every document page, and the version's own
      // status all change on publish — one prefix covers all of them.
      void qc.invalidateQueries({ queryKey: ["policies"] });
    },
  });
}

export function useSetPolicyAudience(policyId: string) {
  const qc = useQueryClient();
  return useMutation({
    /** An empty array is meaningful: it makes the policy public. */
    mutationFn: (roleCodes: string[]) =>
      apiPut<PolicyDetail>(`/admin/policies/${policyId}/audience`, {
        role_codes: roleCodes,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.policies.adminDetail(policyId),
      });
      void qc.invalidateQueries({ queryKey: ["policies"] });
    },
  });
}

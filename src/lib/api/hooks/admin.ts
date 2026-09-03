import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type {
  ActiveUsersOut,
  ActiveUsersTrendOut,
  LatencyTrendOut,
  AdminCoursePage,
  AiModelPricing,
  ContentOut,
  CourseAuthoring,
  CourseProcessingAudit,
  CourseStats,
  DisableUserOut,
  EnableUserOut,
  GrantCreate,
  GrantRead,
  MembershipCreate,
  MembershipRead,
  OverviewOut,
  PermissionRead,
  ProcessingJobOut,
  ProcessingJobRow,
  ProcessingQueueDepth,
  HttpAuditRow,
  DataChangeRow,
  RoleAssignmentCreate,
  RoleAssignmentRead,
  RoleChangeRow,
  RoleWithPermissionsRead,
  User,
  UserListPage,
} from "../types";
import type { CourseEnrollmentRead } from "../types/teacher";

/**
 * The signed-in user's role codes.
 *
 * `enabled` exists for the public pages (policy, help) that want role-scoped
 * content when a session happens to be present but must not fire an
 * authenticated request — and eat a 401 — when it isn't.
 */
export function useMyRoles(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["me", "roles"],
    queryFn: () => apiFetch<string[]>("/me/roles"),
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateEnrollment(enrollmentId: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      status?: string;
      completed_at?: string;
      dropped_at?: string;
    }) =>
      apiPatch<CourseEnrollmentRead>(
        `/teacher/course-enrollments/${enrollmentId}`,
        payload,
      ),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["teacher", "courses", courseId, "roster"],
      }),
  });
}

/**
 * Operator dashboard rollup — `GET /admin/stats/dashboard`.
 *
 * Declared locally rather than pulled from `Schemas[...]`: the checked-in
 * `openapi-snapshot.json` is ~29 endpoints stale, and regenerating it sweeps in
 * unrelated schema churn from other in-flight work (it surfaced 9 type errors in
 * interviews / question-bank / quiz-manage). Mirror of `DashboardOut` in
 * `abridgeai/features/admin/routers/stats.py`.
 *
 * NOTE: `processing_jobs` and `ai_model_calls` carry no organization edge, so the
 * job / cost / latency fields are global even for an org-scoped admin.
 */
/**
 * Operator dashboard rollup.
 *
 * Two contract rules the types encode (PRD ADM-004, section 5):
 *
 * - **Rates are nullable.** `null` means the denominator was empty for the
 *   window; the UI must render "No data". The matching `*_window` counters are
 *   always present so the evidence behind a rate is visible.
 * - **Scopes are declared.** `processing_jobs`, `ai_model_calls` and
 *   `http_audit_log` carry no organization edge, so those families stay
 *   `"global"` even when the caller filtered to one tenant. The dashboard
 *   surfaces that rather than letting a number imply a filter it never had.
 */
export interface AdminDashboardOut {
  // envelope
  as_of: string;
  window_days: number;
  window_from: string | null;
  window_to: string | null;
  organization_id: string | null;
  usage_scope: MetricScope;
  tenant_scope: MetricScope;
  job_scope: MetricScope;
  cost_scope: MetricScope;
  api_scope: MetricScope;
  // reliability & throughput
  job_failure_rate_pct: number | null;
  job_failure_rate_prev_pct: number | null;
  jobs_terminal_window: number;
  jobs_failed_window: number;
  jobs_terminal_prev_window: number;
  jobs_failed_prev_window: number;
  queue_depth: number;
  queue_pending: number;
  queue_running: number;
  queue_oldest_age_seconds: number | null;
  requests_window: number;
  requests_5xx_window: number;
  requests_4xx_window: number;
  api_error_rate_pct: number | null;
  api_client_error_rate_pct: number | null;
  api_p50_latency_ms: number | null;
  api_p95_latency_ms: number | null;
  // cost & capacity
  spend_window_usd: number;
  spend_prev_window_usd: number;
  projected_month_end_usd: number;
  tokens_window: number;
  ai_calls_window: number;
  failed_ai_calls_window: number;
  ai_failure_rate_pct: number | null;
  top_cost_driver: string | null;
  top_cost_driver_usd: number;
  slowest_model: string | null;
  slowest_model_p95_ms: number;
  // usage
  active_users_today: number;
  active_users_window: number;
  total_users: number;
  materials_ingested_window: number;
  // tenant anomalies
  orgs_total: number;
  orgs_inactive_30d: number;
}

/** Which filter a metric family actually honoured. */
export type MetricScope = "global" | "organization";

export interface AdminDashboardParams {
  /** Window length for every windowed metric. Defaults to the server's 7. */
  windowDays?: number;
  /**
   * Exact inclusive date range (ISO ``YYYY-MM-DD``), e.g. from a custom
   * range picker. Overrides ``windowDays`` — the server counts exactly the
   * rows in the span and echoes the dates back in the envelope.
   */
  from?: string;
  to?: string;
  /**
   * Narrow org-traceable metrics to one tenant. Ignored by the server for
   * callers who are already pinned to their own organization, so passing it
   * can never widen what a manager sees.
   */
  organizationId?: string | null;
}

export function useAdminDashboard({
  windowDays,
  from,
  to,
  organizationId,
}: AdminDashboardParams = {}) {
  const params = new URLSearchParams();
  if (windowDays !== undefined && !from)
    params.set("window_days", String(windowDays));
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (organizationId) params.set("organization_id", organizationId);
  const qs = params.toString();
  return useQuery({
    queryKey: queryKeys.admin.dashboard(windowDays, from, to, organizationId),
    queryFn: () =>
      apiFetch<AdminDashboardOut>(
        `/admin/stats/dashboard${qs ? `?${qs}` : ""}`,
      ),
    staleTime: 1000 * 30,
  });
}

export function useAdminStatsOverview() {
  return useQuery({
    queryKey: queryKeys.admin.statsOverview(),
    queryFn: () => apiFetch<OverviewOut>("/admin/stats/overview"),
    staleTime: 1000 * 60,
  });
}

export function useActiveUsersStats() {
  return useQuery({
    queryKey: queryKeys.admin.activeUsers(),
    queryFn: () => apiFetch<ActiveUsersOut>("/admin/stats/active-users"),
    staleTime: 1000 * 60,
  });
}

/**
 * Inclusive calendar range, the same shape the dashboard filter holds.
 *
 * The trends take a range rather than a day count because a day count cannot
 * express a window that ENDS in the past: "Aug 1 - Aug 8" would have been sent
 * as `days=8` and plotted the last 8 days up to today, so the chart quietly
 * described a different span than the KPIs above it.
 */
export interface TrendRange {
  from: string;
  to: string;
}

function trendQuery(range: TrendRange): string {
  return `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
}

export function useActiveUsersTrend(range: TrendRange) {
  return useQuery({
    queryKey: queryKeys.admin.activeUsersTrend(range.from, range.to),
    queryFn: () =>
      apiFetch<ActiveUsersTrendOut>(
        `/admin/stats/active-users/trend?${trendQuery(range)}`,
      ),
    staleTime: 1000 * 60,
  });
}

export function useApiLatencyTrend(range: TrendRange) {
  return useQuery({
    queryKey: queryKeys.admin.latencyTrend(range.from, range.to),
    queryFn: () =>
      apiFetch<LatencyTrendOut>(
        `/admin/stats/latency/trend?${trendQuery(range)}`,
      ),
    staleTime: 1000 * 60,
  });
}

export function useContentStats() {
  return useQuery({
    queryKey: queryKeys.admin.content(),
    queryFn: () => apiFetch<ContentOut>("/admin/stats/content"),
    staleTime: 1000 * 60,
  });
}

export function useUsersList(limit = 20) {
  return useInfinitePage<User>({
    queryKey: queryKeys.admin.users(),
    fetch: async (cursor, lim = limit) => {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (lim) params.set("limit", String(lim));
      const qs = params.toString();
      const page = await apiFetch<UserListPage>(qs ? `/users?${qs}` : "/users");
      return { items: page.items, next_cursor: page.next_cursor ?? null };
    },
    limit,
  });
}

export function useUserDetail(userId: string) {
  return useQuery({
    queryKey: queryKeys.admin.userDetail(userId),
    queryFn: () => apiFetch<User>(`/users/${userId}`),
    enabled: Boolean(userId),
  });
}

export function useAdminCourses(opts?: {
  includeDeleted?: boolean;
  limit?: number;
}) {
  const includeDeleted = opts?.includeDeleted ?? true;
  const limit = opts?.limit ?? 20;
  return useInfinitePage<CourseAuthoring>({
    queryKey: queryKeys.admin.courses(includeDeleted),
    fetch: async (cursor, lim = limit) => {
      const params = new URLSearchParams();
      if (cursor) params.set("cursor", cursor);
      if (lim) params.set("limit", String(lim));
      params.set("include_deleted", String(includeDeleted));
      const page = await apiFetch<AdminCoursePage>(
        `/admin/courses?${params.toString()}`,
      );
      return { items: page.items, next_cursor: page.next_cursor ?? null };
    },
    limit,
  });
}

export function useRestoreCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) =>
      apiPost<CourseAuthoring>(`/admin/courses/${courseId}/restore`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.courseStats() });
    },
  });
}

// Soft-delete a course (reversible cascade tombstone). Mirror of
// useRestoreCourse — the deleted row stays visible in the admin table
// (include_deleted=true) with its Restore action, so a mistaken delete
// is undoable.
export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => apiDelete(`/admin/courses/${courseId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.courseStats() });
    },
  });
}

export function useCourseAudit(courseId: string) {
  return useQuery({
    queryKey: queryKeys.admin.courseAudit(courseId),
    queryFn: () =>
      apiFetch<CourseProcessingAudit>(`/admin/courses/${courseId}/audit`),
    enabled: Boolean(courseId),
    staleTime: 1000 * 30,
  });
}

export function useCourseProcessingJobs(courseId: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.admin.courseProcessing(courseId, limit),
    queryFn: () => {
      const qs = limit ? `?limit=${limit}` : "";
      return apiFetch<ProcessingJobRow[]>(
        `/admin/courses/${courseId}/processing${qs}`,
      );
    },
    enabled: Boolean(courseId),
    staleTime: 1000 * 15,
  });
}

export function useCourseStats() {
  return useQuery({
    queryKey: queryKeys.admin.courseStats(),
    queryFn: () => apiFetch<CourseStats>("/admin/courses/_stats"),
    staleTime: 1000 * 60,
  });
}

export interface AdminUserDetailResponse {
  user: User;
  role_assignments: RoleAssignmentRead[];
  active_sessions: Array<{
    id: string;
    user_id: string;
    expires_at: string;
    revoked_at: string | null;
    mfa_verified_at: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
  }>;
  role_history: Array<{
    assignment_id: string;
    role_code: string;
    role_name: string;
    scope_kind: string;
    organization_name: string | null;
    org_unit_name: string | null;
    course_title: string | null;
    granted_by: string | null;
    granted_by_email: string | null;
    revoked_by: string | null;
    revoked_by_email: string | null;
    created_at: string;
    updated_at: string;
    revoked_at: string | null;
  }>;
}

export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.admin.userDetail(userId),
    queryFn: () => apiFetch<AdminUserDetailResponse>(`/admin/users/${userId}`),
    enabled: Boolean(userId),
  });
}

export function useDisableUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<DisableUserOut>(`/admin/users/${userId}/disable`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.userDetail(userId),
      });
    },
  });
}

export function useEnableUser(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<EnableUserOut>(`/admin/users/${userId}/enable`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "users"] });
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.userDetail(userId),
      });
    },
  });
}

export function useRevokeUserSession(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiPost<{ session_id: string; revoked: boolean }>(
        `/admin/users/${userId}/sessions/${sessionId}/revoke`,
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.admin.userDetail(userId) }),
  });
}

export function useProcessingQueue() {
  return useQuery({
    queryKey: queryKeys.admin.processingQueue(),
    queryFn: () => apiFetch<ProcessingQueueDepth>("/admin/processing/queue"),
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 15,
  });
}

/**
 * Per-status job counts over a caller-supplied window (`since`, same bound
 * as `useProcessingJobs`). This is the source for the status-tab badges on
 * the admin processing page: the table's jobs query is status-filtered, so
 * deriving badges from it collapsed every other tab's count to zero the
 * moment one status was selected; a client-side derivation from an
 * unfiltered list would also be capped at the list limit.
 */
export function useProcessingSummary(since: string, until?: string) {
  return useQuery({
    queryKey: queryKeys.admin.processingSummary(since, until),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", since);
      if (until) params.set("until", until);
      return apiFetch<ProcessingQueueDepth>(
        `/admin/processing/summary?${params.toString()}`,
      );
    },
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  });
}

/**
 * Jobs within a caller-supplied window. `since` is REQUIRED — the backend
 * mandates it, and the page's time-range toolbar is the single source of
 * truth for the window (no hidden default here; that was the bug where the
 * tab counts showed every job while the table silently only fetched 7 days).
 * `limit` defaults to the backend maximum so the client can derive accurate
 * per-status tab counts from the same list the table renders.
 */
export function useProcessingJobs(opts: {
  status?: string;
  since: string;
  until?: string;
  limit?: number;
}) {
  const status = opts?.status;
  const since = opts.since;
  const until = opts?.until;
  const limit = opts?.limit ?? 500;
  return useQuery({
    queryKey: queryKeys.admin.processingJobs(status, since, until),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", since);
      if (until) params.set("until", until);
      if (status) params.set("status", status);
      params.set("limit", String(limit));
      return apiFetch<ProcessingJobOut[]>(
        `/admin/processing/jobs?${params.toString()}`,
      );
    },
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 30,
  });
}

export function useProcessingJob(jobId: string) {
  return useQuery({
    queryKey: queryKeys.admin.processingJob(jobId),
    queryFn: () =>
      apiFetch<ProcessingJobOut>(`/admin/processing/jobs/${jobId}`),
    enabled: Boolean(jobId),
    staleTime: 1000 * 10,
  });
}

export function useRetryProcessingJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiPost<ProcessingJobOut>(`/admin/processing/jobs/${jobId}/retry`),
    onSuccess: (_data, jobId) => {
      void qc.invalidateQueries({ queryKey: ["admin", "processing"] });
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.processingJob(jobId),
      });
    },
  });
}

export function useAiModelPricing() {
  return useQuery({
    queryKey: queryKeys.admin.aiPricing(),
    queryFn: () => apiFetch<AiModelPricing[]>("/admin/ai/pricing"),
    staleTime: 1000 * 30,
  });
}

export interface AiModelPricingInput {
  model_name: string;
  input_usd_per_1m: number;
  output_usd_per_1m: number;
  notes?: string | null;
}

export function useCreateAiModelPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AiModelPricingInput) =>
      apiPost<AiModelPricing>("/admin/ai/pricing", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.aiPricing() });
    },
  });
}

export function useUpdateAiModelPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: Partial<Omit<AiModelPricingInput, "model_name">> & { id: string }) =>
      apiPatch<AiModelPricing>(`/admin/ai/pricing/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.aiPricing() });
    },
  });
}

export function useDeleteAiModelPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/ai/pricing/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.aiPricing() });
    },
  });
}

export function useListPermissions() {
  return useQuery({
    queryKey: queryKeys.admin.permissions(),
    queryFn: () => apiFetch<PermissionRead[]>("/admin/permissions"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useListRoles() {
  return useQuery({
    queryKey: queryKeys.admin.roles(),
    queryFn: () => apiFetch<RoleWithPermissionsRead[]>("/admin/roles"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUserAssignments(userId: string) {
  return useQuery({
    queryKey: queryKeys.admin.userAssignments(userId),
    queryFn: () =>
      apiFetch<RoleAssignmentRead[]>(`/admin/users/${userId}/assignments`),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  });
}

export function useGrantUserAssignment(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RoleAssignmentCreate) =>
      apiPost<RoleAssignmentRead>(
        `/admin/users/${userId}/assignments`,
        payload,
      ),
    onSuccess: () => {
      // The user-detail page renders role_assignments from the aggregate
      // userDetail query, NOT from userAssignments — invalidate both so
      // the list refreshes in place after a grant.
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.userAssignments(userId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.userDetail(userId),
      });
    },
  });
}

export function useRevokeUserAssignment(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiDelete(`/admin/users/${userId}/assignments/${assignmentId}`),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.userAssignments(userId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.userDetail(userId),
      });
    },
  });
}

export function useUserGrants(userId: string) {
  return useQuery({
    queryKey: queryKeys.admin.userGrants(userId),
    queryFn: () => apiFetch<GrantRead[]>(`/admin/users/${userId}/grants`),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  });
}

export function useGrantPermission(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GrantCreate) =>
      apiPost<GrantRead>(`/admin/users/${userId}/grants`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.userGrants(userId),
      });
    },
  });
}

export function useRevokePermissionGrant(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) =>
      apiDelete(`/admin/users/${userId}/grants/${grantId}`),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.userGrants(userId),
      });
    },
  });
}

export function useOrgMemberships(orgId: string) {
  return useQuery({
    queryKey: queryKeys.admin.orgMemberships(orgId),
    queryFn: () =>
      apiFetch<MembershipRead[]>(`/admin/organizations/${orgId}/memberships`),
    enabled: Boolean(orgId),
    staleTime: 1000 * 30,
  });
}

export function useAddOrgMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MembershipCreate) =>
      apiPost<MembershipRead>(
        `/admin/organizations/${orgId}/memberships`,
        payload,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.orgMemberships(orgId),
      });
    },
  });
}

/** FR-6.7 — role-assignment changes within `[since, until)`. */
export function useAuditRoleChanges(sinceIso: string, untilIso?: string) {
  return useQuery({
    queryKey: queryKeys.admin.auditRoleChanges(sinceIso, untilIso),
    queryFn: () => {
      const params = new URLSearchParams({ since: sinceIso, limit: "200" });
      if (untilIso) params.set("until", untilIso);
      return apiFetch<RoleChangeRow[]>(
        `/admin/audit/role-changes?${params.toString()}`,
      );
    },
    enabled: Boolean(sinceIso),
    staleTime: 1000 * 30,
  });
}

/** FR-6.7 — HTTP request audit scan within `[since, until)`. */
export function useAuditHttp(
  sinceIso: string,
  untilIso?: string,
  path?: string,
  userId?: string,
  eventKind?: "login_failure" | "denied",
  requestId?: string,
) {
  return useQuery({
    queryKey: queryKeys.admin.auditHttp(
      sinceIso,
      untilIso,
      path,
      userId,
      eventKind,
      requestId,
    ),
    queryFn: () => {
      const params = new URLSearchParams({ since: sinceIso, limit: "200" });
      if (untilIso) params.set("until", untilIso);
      if (path) params.set("path_pattern", path);
      if (userId) params.set("user_id", userId);
      if (eventKind) params.set("event_kind", eventKind);
      if (requestId) params.set("request_id", requestId);
      return apiFetch<HttpAuditRow[]>(`/admin/audit/http?${params.toString()}`);
    },
    enabled: Boolean(sinceIso),
    staleTime: 1000 * 30,
  });
}

/**
 * FR-6.7 — data-change lookup for a single entity across the supported
 * tables (courses / materials / users / role_assignments). Fires only once
 * both `table` and a well-formed `entityId` are present so the on-demand
 * lookup doesn't fire on an empty form.
 */
export function useAuditDataChanges(table: string, entityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.auditDataChanges(table, entityId),
    queryFn: () => {
      const params = new URLSearchParams({ table, entity_id: entityId });
      return apiFetch<DataChangeRow>(
        `/admin/audit/data-changes?${params.toString()}`,
      );
    },
    enabled: Boolean(table) && Boolean(entityId),
    retry: false,
    staleTime: 1000 * 30,
  });
}

/** FR-6.7 — every row in `table` changed within `[since, until)`, newest first. */
export function useAuditDataChangesList(
  table: string,
  sinceIso: string,
  untilIso?: string,
) {
  return useQuery({
    queryKey: queryKeys.admin.auditDataChangesList(table, sinceIso, untilIso),
    queryFn: () => {
      const params = new URLSearchParams({
        table,
        since: sinceIso,
        limit: "200",
      });
      if (untilIso) params.set("until", untilIso);
      return apiFetch<DataChangeRow[]>(
        `/admin/audit/data-changes/list?${params.toString()}`,
      );
    },
    enabled: Boolean(table) && Boolean(sinceIso),
    staleTime: 1000 * 30,
  });
}

/** Batch-resolve user UUIDs → displayable users (audit screens). */
export function useUsersByIds(userIds: string[]) {
  const unique = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).slice(0, 100),
    [userIds],
  );
  const idsKey = unique.join(",");
  return useQuery({
    queryKey: queryKeys.admin.usersByIds(idsKey),
    queryFn: () =>
      apiFetch<User[]>(`/users/by-ids?ids=${encodeURIComponent(idsKey)}`),
    enabled: unique.length > 0,
    staleTime: 60 * 1000,
  });
}

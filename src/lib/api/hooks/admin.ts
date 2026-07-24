import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type {
  ActiveUsersOut,
  AdminCoursePage,
  AiCostsByPipeline,
  AiCostsByCategory,
  AiCostsByModel,
  AiCostsByUser,
  AiCostsRecentCall,
  AiCostsSummary,
  AiModelPricing,
  ContentOut,
  CourseAuthoring,
  CourseProcessingAudit,
  CourseStats,
  DisableUserOut,
  EnableUserOut,
  GrantCreate,
  GrantRead,
  HealthOut,
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

export type AiCostsPeriod = "24h" | "7d" | "30d";

export type AiCostsDimension =
  | "operation"
  | "role"
  | "tier"
  | "stage_name"
  | "model_name"
  | "status";

/** Optional cross-dashboard filters (all narrow the same audit rows). */
export interface AiCostsFilters {
  model?: string | null;
  role?: string | null;
  operation?: string | null;
  status?: string | null;
}

const AI_COSTS_PERIOD_MS: Record<AiCostsPeriod, number> = {
  "24h": 1000 * 60 * 60 * 24,
  "7d": 1000 * 60 * 60 * 24 * 7,
  "30d": 1000 * 60 * 60 * 24 * 30,
};

function aiCostsSinceIso(period: AiCostsPeriod): string {
  return new Date(Date.now() - AI_COSTS_PERIOD_MS[period]).toISOString();
}

/** Append only the set filter params; returns a stable key fragment too. */
function applyAiCostsFilters(
  params: URLSearchParams,
  filters?: AiCostsFilters,
): void {
  if (!filters) return;
  if (filters.model) params.set("model", filters.model);
  if (filters.role) params.set("role", filters.role);
  if (filters.operation) params.set("operation", filters.operation);
  if (filters.status) params.set("status", filters.status);
}

function aiCostsFilterKey(filters?: AiCostsFilters): string {
  if (!filters) return "";
  return [
    filters.model ?? "",
    filters.role ?? "",
    filters.operation ?? "",
    filters.status ?? "",
  ].join("|");
}

export function useMyRoles() {
  return useQuery({
    queryKey: ["me", "roles"],
    queryFn: () => apiFetch<string[]>("/me/roles"),
    staleTime: 1000 * 60 * 5,
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

export function useContentStats() {
  return useQuery({
    queryKey: queryKeys.admin.content(),
    queryFn: () => apiFetch<ContentOut>("/admin/stats/content"),
    staleTime: 1000 * 60,
  });
}

export function useStatsHealth(since: string) {
  return useQuery({
    queryKey: queryKeys.admin.statsHealth(since),
    queryFn: () =>
      apiFetch<HealthOut>(
        `/admin/stats/health?since=${encodeURIComponent(since)}`,
      ),
    staleTime: 1000 * 30,
    enabled: Boolean(since),
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
    mutationFn: (courseId: string) =>
      apiDelete(`/admin/courses/${courseId}`),
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

export function useProcessingQueue() {
  return useQuery({
    queryKey: queryKeys.admin.processingQueue(),
    queryFn: () => apiFetch<ProcessingQueueDepth>("/admin/processing/queue"),
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 15,
  });
}

const PROCESSING_JOBS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

export function useProcessingJobs(opts?: {
  status?: string;
  since?: string;
  limit?: number;
}) {
  const status = opts?.status;
  const since =
    opts?.since ??
    new Date(Date.now() - PROCESSING_JOBS_WINDOW_MS).toISOString();
  const limit = opts?.limit ?? 50;
  return useQuery({
    queryKey: queryKeys.admin.processingJobs(status),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", since);
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

export function useAiCostsSummary(
  period: AiCostsPeriod = "30d",
  filters?: AiCostsFilters,
) {
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.summary(
      period,
      aiCostsFilterKey(filters),
    ),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", aiCostsSinceIso(period));
      applyAiCostsFilters(params, filters);
      return apiFetch<AiCostsSummary>(
        `/admin/ai/costs/summary?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

export function useAiCostsByCategory(opts?: {
  dimension?: AiCostsDimension;
  topN?: number;
  period?: AiCostsPeriod;
  filters?: AiCostsFilters;
}) {
  const dimension = opts?.dimension ?? "operation";
  const topN = opts?.topN ?? 20;
  const period = opts?.period ?? "30d";
  const filters = opts?.filters;
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byCategory(
      dimension,
      period,
      aiCostsFilterKey(filters),
    ),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("dimension", dimension);
      params.set("since", aiCostsSinceIso(period));
      params.set("top_n", String(topN));
      applyAiCostsFilters(params, filters);
      return apiFetch<AiCostsByCategory[]>(
        `/admin/ai/costs/by-category?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

export function useAiCostsByModel(opts?: {
  topN?: number;
  period?: AiCostsPeriod;
  filters?: AiCostsFilters;
}) {
  const topN = opts?.topN ?? 20;
  const period = opts?.period ?? "30d";
  const filters = opts?.filters;
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byModel(
      period,
      aiCostsFilterKey(filters),
    ),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", aiCostsSinceIso(period));
      params.set("top_n", String(topN));
      applyAiCostsFilters(params, filters);
      return apiFetch<AiCostsByModel[]>(
        `/admin/ai/costs/by-model?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

export function useAiCostsByUser(opts?: {
  topN?: number;
  period?: AiCostsPeriod;
}) {
  const topN = opts?.topN ?? 20;
  const period = opts?.period ?? "30d";
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byUser(topN, period),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", aiCostsSinceIso(period));
      params.set("top_n", String(topN));
      return apiFetch<AiCostsByUser[]>(
        `/admin/ai/costs/by-user?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

export function useAiCostsByPipeline(opts?: {
  topN?: number;
  period?: AiCostsPeriod;
}) {
  const topN = opts?.topN ?? 20;
  const period = opts?.period ?? "30d";
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.byPipeline(period),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("since", aiCostsSinceIso(period));
      params.set("top_n", String(topN));
      return apiFetch<AiCostsByPipeline[]>(
        `/admin/ai/costs/by-pipeline?${params.toString()}`,
      );
    },
    staleTime: 1000 * 60,
  });
}

/**
 * Recent AI calls.
 *
 * The backend currently exposes a flat `?limit=` endpoint with no cursor; we
 * therefore wrap a single `useQuery` and surface an `InfiniteList`-compatible
 * interface so callers can swap to true cursor pagination once the API grows.
 */
export function useRecentAiCalls(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 50;
  return useQuery({
    queryKey: queryKeys.admin.aiCosts.recent(limit),
    queryFn: () =>
      apiFetch<AiCostsRecentCall[]>(`/admin/ai/costs/recent?limit=${limit}`),
    staleTime: 1000 * 30,
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
      void qc.invalidateQueries({
        queryKey: queryKeys.admin.userAssignments(userId),
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

/** FR-6.7 — role-assignment changes since a timestamp (admin audit). */
export function useAuditRoleChanges(sinceIso: string) {
  return useQuery({
    queryKey: queryKeys.admin.auditRoleChanges(sinceIso),
    queryFn: () =>
      apiFetch<RoleChangeRow[]>(
        `/admin/audit/role-changes?since=${encodeURIComponent(sinceIso)}&limit=200`,
      ),
    enabled: Boolean(sinceIso),
    staleTime: 1000 * 30,
  });
}

/** FR-6.7 — HTTP request audit scan (admin audit). */
export function useAuditHttp(sinceIso: string, path?: string, userId?: string) {
  return useQuery({
    queryKey: queryKeys.admin.auditHttp(sinceIso, path, userId),
    queryFn: () => {
      const params = new URLSearchParams({ since: sinceIso, limit: "200" });
      if (path) params.set("path_pattern", path);
      if (userId) params.set("user_id", userId);
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

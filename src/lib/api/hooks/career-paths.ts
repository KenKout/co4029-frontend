import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiDelete, apiFetch, apiPatch, apiPost, apiPut } from "../client";
import { queryKeys } from "../query-keys";
import { useInfinitePage } from "../use-infinite-page";
import type {
  CareerPathAuthoring,
  CareerPathCourseAdd,
  CareerPathCourseAuthoring,
  CareerPathCreate,
  CareerPathProgressRead,
  CareerPathPublic,
  CareerPathUpdate,
  MyCareerEnrollmentRead,
  PathReadinessOverview,
  StudentPathProgressAuthoring,
} from "../types";

/* ── Learner-side (W5.8) ─────────────────────────────────────────────── */

interface CareerPathListPage {
  items: CareerPathPublic[];
  next_cursor: string | null;
}

/**
 * Cursor-paginated published career paths (Reconciliation §A10/§D2).
 *
 * Returns a flattened `items[]` plus standard infinite-scroll handles
 * (`hasNextPage` / `fetchNextPage` / `isFetchingNextPage`) so the
 * learner catalogue auto-loads as the user scrolls.
 */
export function useCareerPaths(limit = 20) {
  return useInfinitePage<CareerPathPublic>({
    queryKey: queryKeys.careerPaths.list(),
    fetch: async (cursor, pageLimit = limit) => {
      const qs = new URLSearchParams();
      if (pageLimit) qs.set("limit", String(pageLimit));
      if (cursor) qs.set("cursor", cursor);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      const page = await apiFetch<CareerPathListPage>(`/career-paths${suffix}`);
      return { items: page.items, next_cursor: page.next_cursor ?? null };
    },
    limit,
  });
}

export function useCareerPath(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.careerPaths.bySlug(slug ?? ""),
    queryFn: () => apiFetch<CareerPathPublic>(`/career-paths/${slug}`),
    enabled: !!slug,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}

export function useMyCareerEnrollments() {
  return useQuery({
    queryKey: queryKeys.careerPaths.myEnrollments(),
    queryFn: () =>
      apiFetch<MyCareerEnrollmentRead[]>("/me/career-enrollments"),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCareerPathProgress(careerPathId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.careerPaths.progress(careerPathId ?? ""),
    queryFn: () =>
      apiFetch<CareerPathProgressRead>(
        `/me/career-enrollments/${careerPathId}/progress`,
      ),
    enabled: !!careerPathId,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}

/* ── Manager-side (W5.9) ─────────────────────────────────────────────── */

export function useCreateCareerPath() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CareerPathCreate) =>
      apiPost<CareerPathAuthoring>("/management/career-paths", payload),
    onSuccess: (path) => {
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementList(path.organization_id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementList(
          path.organization_id,
          true,
        ),
      });
      qc.invalidateQueries({ queryKey: queryKeys.careerPaths.list() });
    },
  });
}

export function useListManagedCareerPaths(opts: {
  organizationId?: string;
  includeArchived?: boolean;
  enabled?: boolean;
}) {
  const { organizationId, includeArchived, enabled = true } = opts;
  return useQuery({
    queryKey: queryKeys.careerPaths.managementList(
      organizationId ?? "",
      includeArchived,
    ),
    queryFn: () => {
      const params = new URLSearchParams();
      if (organizationId) params.set("organization_id", organizationId);
      if (includeArchived) params.set("include_archived", "true");
      const qs = params.toString();
      return apiFetch<CareerPathAuthoring[]>(
        qs ? `/management/career-paths?${qs}` : `/management/career-paths`,
      );
    },
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}

export function useManagedCareerPath(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.careerPaths.managementDetail(id ?? ""),
    queryFn: () =>
      apiFetch<CareerPathAuthoring>(`/management/career-paths/${id}`),
    enabled: !!id,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 3;
    },
  });
}

export function usePatchCareerPath(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CareerPathUpdate) =>
      apiPatch<CareerPathAuthoring>(`/management/career-paths/${id}`, payload),
    onSuccess: (path) => {
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementDetail(id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementList(path.organization_id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementList(
          path.organization_id,
          true,
        ),
      });
      qc.invalidateQueries({ queryKey: queryKeys.careerPaths.list() });
    },
  });
}

export function useCareerPathCourses(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.careerPaths.managementCourses(id ?? ""),
    queryFn: () =>
      apiFetch<CareerPathCourseAuthoring[]>(
        `/management/career-paths/${id}/courses`,
      ),
    enabled: !!id,
  });
}

export function useAddCareerPathCourse(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CareerPathCourseAdd) =>
      apiPost<CareerPathCourseAuthoring>(
        `/management/career-paths/${id}/courses`,
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementCourses(id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementDetail(id),
      });
    },
  });
}

/**
 * Reorder body MUST contain the FULL ordered list of course UUIDs.
 * Backend rejects partial orderings.
 */
export function useReorderCareerPathCourses(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseIds: string[]) =>
      apiPut<CareerPathCourseAuthoring[]>(
        `/management/career-paths/${id}/courses/reorder`,
        { course_ids: courseIds },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementCourses(id),
      });
    },
  });
}

export function useRemoveCareerPathCourse(id: string, courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiDelete(`/management/career-paths/${id}/courses/${courseId}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementCourses(id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementDetail(id),
      });
    },
  });
}

export function useAddCareerPathStudent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { student_id: string }) =>
      apiPost<unknown>(`/management/career-paths/${id}/students`, payload),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.teacherProgress(id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementDetail(id),
      });
    },
  });
}

export function useRemoveCareerPathStudent(id: string, studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiDelete(`/management/career-paths/${id}/students/${studentId}`),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.teacherProgress(id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementDetail(id),
      });
    },
  });
}

export function usePublishCareerPath(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<CareerPathAuthoring>(`/management/career-paths/${id}/publish`),
    onSuccess: (path) => {
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementDetail(id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementList(path.organization_id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementList(
          path.organization_id,
          true,
        ),
      });
      qc.invalidateQueries({ queryKey: queryKeys.careerPaths.list() });
    },
  });
}

export function useArchiveCareerPath(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiPost<CareerPathAuthoring>(`/management/career-paths/${id}/archive`),
    onSuccess: (path) => {
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementDetail(id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementList(path.organization_id),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.careerPaths.managementList(
          path.organization_id,
          true,
        ),
      });
      qc.invalidateQueries({ queryKey: queryKeys.careerPaths.list() });
    },
  });
}

/* ── Teacher-side (W5.9 spec lists this here) ────────────────────────── */

export function useTeacherCareerPathProgress(careerPathId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.careerPaths.teacherProgress(careerPathId ?? ""),
    queryFn: () =>
      apiFetch<StudentPathProgressAuthoring[]>(
        `/teacher/career-paths/${careerPathId}/students/progress`,
      ),
    enabled: !!careerPathId,
    staleTime: 1000 * 60,
  });
}

/** FR-6.8 — latest readiness snapshots aggregate (manager view). */
export function usePathReadinessOverview(careerPathId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.careerPaths.readiness(careerPathId ?? ""),
    queryFn: () =>
      apiFetch<PathReadinessOverview>(
        `/management/career-paths/${careerPathId}/readiness`,
      ),
    enabled: !!careerPathId,
    staleTime: 1000 * 60,
  });
}

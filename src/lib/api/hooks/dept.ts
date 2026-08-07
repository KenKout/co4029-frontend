import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost } from "../client";
import { queryKeys } from "../query-keys";
import type {
  AssignableTeacher,
  AssignTeacherRequest,
  CourseAuthoring,
  CourseReadiness,
  CourseUpdate,
  RosterEntry,
  TeacherAssignmentCreated,
  TeacherAssignmentRead,
} from "../types";

export function useDeptCourses() {
  return useQuery({
    queryKey: queryKeys.dept.courses(),
    queryFn: () => apiFetch<CourseAuthoring[]>("/dept/courses"),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCourseTeachers(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dept.teachers(courseId ?? ""),
    queryFn: () =>
      apiFetch<TeacherAssignmentRead[]>(`/dept/courses/${courseId}/teachers`),
    enabled: Boolean(courseId),
    staleTime: 1000 * 60,
  });
}

/**
 * Is this course actually deliverable? Teacher, content, career-path placement
 * and status — asked before publish rather than discovered as a 409 after.
 */
export function useCourseReadiness(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dept.readiness(courseId ?? ""),
    queryFn: () =>
      apiFetch<CourseReadiness>(`/dept/courses/${courseId}/readiness`),
    enabled: Boolean(courseId),
    staleTime: 1000 * 30,
  });
}

/**
 * Teachers this course may be staffed with: same organization, teacher role.
 *
 * The org filter is applied server-side from the course, so this hook passes
 * no org parameter — there is nothing for the client to get wrong.
 */
export function useAssignableTeachers(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dept.assignableTeachers(courseId ?? ""),
    queryFn: () =>
      apiFetch<AssignableTeacher[]>(
        `/dept/courses/${courseId}/assignable-teachers`,
      ),
    enabled: Boolean(courseId),
    staleTime: 1000 * 60,
  });
}

export function useAssignTeacher(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignTeacherRequest) =>
      apiPost<TeacherAssignmentCreated>(
        `/dept/courses/${courseId}/teachers`,
        body,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.dept.teachers(courseId),
      });
      // The picker shows already_assigned, so it is stale the moment an
      // assignment lands.
      void qc.invalidateQueries({
        queryKey: queryKeys.dept.assignableTeachers(courseId),
      });
      // The checklist counts teachers, so it moved too.
      void qc.invalidateQueries({
        queryKey: queryKeys.dept.readiness(courseId),
      });
    },
  });
}

export function useRemoveTeacher(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiDelete(`/dept/courses/${courseId}/teachers/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.dept.teachers(courseId),
      });
      // Removing a teacher makes them selectable again, so the picker's
      // already_assigned flags are stale too.
      void qc.invalidateQueries({
        queryKey: queryKeys.dept.assignableTeachers(courseId),
      });
      // The checklist counts teachers, so it moved too.
      void qc.invalidateQueries({
        queryKey: queryKeys.dept.readiness(courseId),
      });
    },
  });
}

export function useCourseRoster(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dept.roster(courseId ?? ""),
    queryFn: () => apiFetch<RosterEntry[]>(`/dept/courses/${courseId}/roster`),
    enabled: Boolean(courseId),
    staleTime: 1000 * 60,
  });
}

export function useOrgUnitCourses(orgUnitId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dept.orgUnitCourses(orgUnitId ?? ""),
    queryFn: () =>
      apiFetch<CourseAuthoring[]>(`/dept/org-units/${orgUnitId}/courses`),
    enabled: Boolean(orgUnitId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useDeleteDeptCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => apiDelete(`/dept/courses/${courseId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dept.courses() });
    },
  });
}

/** Manager-owned course identity update (title/slug/…) on the dept surface. */
export function useUpdateDeptCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CourseUpdate) =>
      apiPatch<CourseAuthoring>(`/dept/courses/${courseId}`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dept.courses() });
    },
  });
}

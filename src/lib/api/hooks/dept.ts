import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiFetch, apiPatch, apiPost, apiPut } from "../client";
import { queryKeys } from "../query-keys";
import type {
  AssignableTeacher,
  AssignTeacherRequest,
  CourseAuthoring,
  CourseCloneDepth,
  CourseReadiness,
  CourseUpdate,
  RosterEntry,
  TeacherAssignmentCreated,
  TeacherAssignmentRead,
} from "../types";

/**
 * Courses in the caller's staffing scope, optionally narrowed to one org unit.
 *
 * With `orgUnitId` the request goes to the per-unit endpoint, which returns
 * the unit **and every unit below it** — a faculty includes its departments,
 * matching how the permission engine already reads the tree. Without it the
 * backend derives the scope from the caller's own role assignment.
 */
export function useDeptCourses(facultyId?: string | null) {
  return useQuery({
    queryKey: facultyId
      ? ([...queryKeys.dept.courses(), "faculty", facultyId] as const)
      : queryKeys.dept.courses(),
    queryFn: () =>
      apiFetch<CourseAuthoring[]>(
        facultyId
          ? `/dept/faculties/${facultyId}/courses`
          : "/dept/courses",
      ),
    // No staleTime: the dept course DETAIL header reads this list (there is
    // no /dept/courses/{id} endpoint) and must never show a renamed or
    // republished course under its old title/status.
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
 * Teachers available for a course that has not been created yet.
 *
 * The create wizard staffs the course in the same form that creates it, so
 * there is no course id to scope by. The server derives the organization from
 * the caller's token — the same org `create_course` stamps on the new row — so
 * the picker cannot offer someone the follow-up assignment would reject.
 */
export function useAssignableTeachersForNewCourse(
  facultyId?: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...queryKeys.dept.assignableTeachersForNew(),
      facultyId ?? "organization",
    ] as const,
    queryFn: () =>
      apiFetch<AssignableTeacher[]>(
        `/dept/assignable-teachers${
          facultyId ? `?faculty_id=${encodeURIComponent(facultyId)}` : ""
        }`,
      ),
    enabled,
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

/**
 * Switch an assigned teacher's course-scoped title (CI ⇄ TA) via
 * PUT /dept/courses/{id}/teachers/{userId}/role. Server invariants (user
 * decision 2026-08-30): titles are independent flags — both may be true;
 * clearing both, or turning off the LAST Course Instructor while the course
 * still has teachers, returns 409 — surface that to the manager.
 */
export function useSetTeacherTitles(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      isInstructor,
      isAssistant,
    }: {
      userId: string;
      isInstructor: boolean;
      isAssistant: boolean;
    }) =>
      apiPut<TeacherAssignmentRead>(
        `/dept/courses/${courseId}/teachers/${userId}/role`,
        { is_instructor: isInstructor, is_assistant: isAssistant },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.dept.teachers(courseId),
      });
      // The checklist counts instructors & staffs within [min, max], so it
      // moved too.
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

/**
 * Remove several teachers in one request.
 *
 * All-or-nothing server-side, and the sole-instructor guard is checked
 * against the state the course is left in — so this either removes every
 * selected teacher or refuses with a 409 and changes nothing.
 */
export function useBulkRemoveTeachers(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userIds: string[]) =>
      apiPost<{ removed: number }>(
        `/dept/courses/${courseId}/teachers/bulk-remove`,
        { user_ids: userIds },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.dept.teachers(courseId),
      });
      // Removed teachers become selectable again, so the picker's
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

export function useOrgUnitCourses(facultyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dept.orgUnitCourses(facultyId ?? ""),
    queryFn: () =>
      apiFetch<CourseAuthoring[]>(`/dept/faculties/${facultyId}/courses`),
    enabled: Boolean(facultyId),
    staleTime: 1000 * 60 * 2,
  });
}

/** Manager-owned course delete (``course.delete``) on the dept surface. */
export function useDeleteDeptCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => apiDelete(`/dept/courses/${courseId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.dept.courses() });
    },
  });
}

/**
 * Manager-only course clone with selectable depth (``course.delete`` gate).
 * Creates a fresh draft course owned by the manager; returns the new course.
 */
export function useCloneDeptCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      depth,
    }: {
      courseId: string;
      depth: CourseCloneDepth;
    }) => apiPost<CourseAuthoring>(`/dept/courses/${courseId}/clone`, { depth }),
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

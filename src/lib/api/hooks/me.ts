import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../client";
import { queryKeys } from "../query-keys";
import type { EnrollmentRead } from "../types";

function retryUnless404(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status === 404) return false;
  return failureCount < 3;
}

export function useMyEnrollments() {
  return useQuery({
    queryKey: queryKeys.me.enrollments(),
    queryFn: () => apiFetch<EnrollmentRead[]>("/me/enrollments"),
    staleTime: 1000 * 60,
  });
}

export function useMyEnrollment(courseId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.me.enrollment(courseId ?? ""),
    queryFn: () => apiFetch<EnrollmentRead>(`/me/enrollments/${courseId}`),
    enabled: Boolean(courseId),
    staleTime: 1000 * 60,
    retry: retryUnless404,
  });
}

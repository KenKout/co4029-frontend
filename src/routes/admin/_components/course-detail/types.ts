import type {
  useCourseAudit,
  useCourseProcessingJobs,
} from "@/lib/api/hooks/admin";

/**
 * Shared types for the admin course-detail page, extracted from the former
 * 172-pure-LOC / complexity-25 `AdminCourseDetailPage`.
 */

export type TFn = (key: string, opts?: Record<string, unknown>) => string;

export type CourseAuditQuery = ReturnType<typeof useCourseAudit>;

export type CourseJobsQuery = ReturnType<typeof useCourseProcessingJobs>;

export interface CourseDetailFormatters {
  formatDate: (iso: string | null | undefined) => string;
  formatNumber: (n: number | undefined | null) => string;
  formatUsd: (n: number | undefined | null) => string;
}

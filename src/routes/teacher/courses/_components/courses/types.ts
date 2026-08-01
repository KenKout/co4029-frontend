/**
 * Shared types for the teacher Courses index, extracted from the former
 * 234-line courses.tsx so the orchestrator, the controller hook and the
 * presentational components agree on one definition.
 */

export type StatusFilter = "all" | "published" | "draft" | "archived";

export type SortKey = "recent" | "oldest" | "title";

/** Per-status course counts, keyed so `counts[statusFilter]` still works. */
export type StatusCounts = Record<StatusFilter, number>;

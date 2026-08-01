/**
 * Shared types for the course-wide Assessments tab, extracted from the former
 * 458-line course-assessments.tsx so the orchestrator, the filter helpers and
 * the presentational components agree on one definition.
 */

export type Tab = "quizzes" | "interviews";

/** The filter dimensions both tabs are narrowed by, as one snapshot. */
export interface AssessmentFilterCriteria {
  search: string;
  titleFilter: string;
  resultFilter: string;
  timeCutoff: number | null;
}

/** One removable active-filter chip. */
export interface ActiveChip {
  key: string;
  prefix: string;
  label: string;
  onRemove: () => void;
}

/** What the chip row reads: the raw filter values, not the derived cutoff. */
export interface ActiveChipCriteria {
  search: string;
  titleFilter: string;
  resultFilter: string;
  timeFilter: string;
}

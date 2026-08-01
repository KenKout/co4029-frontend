/**
 * Chip labels and dropdown option lists of the course-wide Assessments tab,
 * moved verbatim out of the former 458-line course-assessments.tsx. The two
 * label maps were re-created on every render inside the page component; as
 * module constants they hold the same values.
 */

export const RESULT_LABELS: Record<string, string> = {
  passed: "Passed",
  not_passed: "Not passed",
  grading: "Grading",
  evaluating: "Evaluating",
  in_progress: "In progress",
  failed: "Evaluation failed",
  not_graded: "Not graded",
};

export const TIME_LABELS: Record<string, string> = {
  today: "Last 24 hours",
  "7": "Last 7 days",
  "30": "Last 30 days",
  "90": "Last 90 days",
};

/** Result options shared by both tabs, in their original order. */
export const SHARED_RESULT_OPTIONS = [
  { value: "all", label: "All results" },
  { value: "passed", label: "Passed" },
  { value: "not_passed", label: "Not passed" },
];

/** Result options only the Quizzes tab offers. */
export const QUIZ_RESULT_OPTIONS = [
  { value: "grading", label: "Grading" },
  { value: "in_progress", label: "In progress" },
];

/** Result options only the Interviews tab offers. */
export const INTERVIEW_RESULT_OPTIONS = [
  { value: "evaluating", label: "Evaluating" },
  { value: "in_progress", label: "In progress" },
  { value: "failed", label: "Evaluation failed" },
  { value: "not_graded", label: "Not graded" },
];

/** Time-window options, shared by both tabs. */
export const TIME_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

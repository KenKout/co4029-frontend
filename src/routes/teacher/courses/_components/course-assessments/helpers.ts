import type {
  InterviewSessionTeacherRead,
  QuizAttemptTeacherRead,
} from "@/lib/api/types";

import { RESULT_LABELS, TIME_LABELS } from "./constants";
import type {
  ActiveChip,
  ActiveChipCriteria,
  AssessmentFilterCriteria,
  Tab,
} from "./types";

/**
 * Pure filter / derive helpers of the course-wide Assessments tab, moved out of
 * the former 458-line course-assessments.tsx.
 *
 * The two result-bucket ternary chains and the search test used to sit inline
 * inside the filter predicates, which is what pushed those predicates to
 * complexity 16 and 17. Naming them changes no branch: `matchesSearch` returns
 * true when there is no query or either field contains it, so
 * `!matchesSearch(...)` is exactly the original
 * `q && !nameHit && !titleHit` exclusion.
 */

/** The attempt's bucket in the "Result" filter, unchanged from the inline form. */
export function quizResultOf(a: QuizAttemptTeacherRead): string {
  return a.status === "in_progress"
    ? "in_progress"
    : a.passed === true
      ? "passed"
      : a.passed === false
        ? "not_passed"
        : "grading";
}

/** The session's bucket in the "Result" filter, unchanged from the inline form. */
export function interviewResultOf(s: InterviewSessionTeacherRead): string {
  return s.status === "in_progress"
    ? "in_progress"
    : s.status === "failed"
      ? "failed"
      : s.status === "abandoned"
        ? "not_graded"
        : s.pass_verdict === true
          ? "passed"
          : s.pass_verdict === false
            ? "not_passed"
            : "evaluating";
}

/** Free-text test over the student name and the quiz / interview title. */
export function matchesSearch(
  q: string,
  studentName: string | null | undefined,
  title: string,
): boolean {
  if (!q) return true;
  return (
    (studentName ?? "").toLowerCase().includes(q) ||
    title.toLowerCase().includes(q)
  );
}

export function filterQuizAttempts(
  attempts: QuizAttemptTeacherRead[] | undefined,
  criteria: AssessmentFilterCriteria,
): QuizAttemptTeacherRead[] {
  const { search, titleFilter, resultFilter, timeCutoff } = criteria;
  const q = search.trim().toLowerCase();
  return (attempts ?? []).filter((a) => {
    if (!matchesSearch(q, a.student_name, a.quiz_title)) return false;
    if (titleFilter !== "all" && a.quiz_title !== titleFilter) return false;
    if (resultFilter !== "all") {
      const r = quizResultOf(a);
      if (r !== resultFilter) return false;
    }
    if (timeCutoff != null) {
      const ts = new Date(a.submitted_at ?? a.started_at).getTime();
      if (Number.isNaN(ts) || ts < timeCutoff) return false;
    }
    return true;
  });
}

export function filterInterviewSessions(
  sessions: InterviewSessionTeacherRead[] | undefined,
  criteria: AssessmentFilterCriteria,
): InterviewSessionTeacherRead[] {
  const { search, titleFilter, resultFilter, timeCutoff } = criteria;
  const q = search.trim().toLowerCase();
  return (sessions ?? []).filter((s) => {
    if (!matchesSearch(q, s.student_name, s.interview_config_title))
      return false;
    if (titleFilter !== "all" && s.interview_config_title !== titleFilter)
      return false;
    if (resultFilter !== "all") {
      const r = interviewResultOf(s);
      if (r !== resultFilter) return false;
    }
    if (timeCutoff != null) {
      const ts = new Date(s.started_at).getTime();
      if (Number.isNaN(ts) || ts < timeCutoff) return false;
    }
    return true;
  });
}

/** Distinct quiz titles for the title dropdown, sorted A→Z. */
export function collectQuizTitles(
  attempts: QuizAttemptTeacherRead[] | undefined,
): string[] {
  const set = new Set<string>();
  for (const a of attempts ?? []) set.add(a.quiz_title);
  return [...set].sort((x, y) => x.localeCompare(y));
}

/** Distinct interview titles for the title dropdown, sorted A→Z. */
export function collectInterviewTitles(
  sessions: InterviewSessionTeacherRead[] | undefined,
): string[] {
  const set = new Set<string>();
  for (const s of sessions ?? []) set.add(s.interview_config_title);
  return [...set].sort((x, y) => x.localeCompare(y));
}

/** How many distinct students appear across both assessment kinds. */
export function countDistinctStudents(
  attempts: QuizAttemptTeacherRead[] | undefined,
  sessions: InterviewSessionTeacherRead[] | undefined,
): number {
  const ids = new Set<string>();
  for (const a of attempts ?? []) ids.add(a.student_id);
  for (const s of sessions ?? []) ids.add(s.student_id);
  return ids.size;
}

/** Pass rate across graded quiz attempts, or null when nothing is graded. */
export function computeQuizPassRate(
  attempts: QuizAttemptTeacherRead[] | undefined,
): number | null {
  const graded = (attempts ?? []).filter((a) => a.passed !== null);
  if (graded.length === 0) return null;
  return (graded.filter((a) => a.passed).length / graded.length) * 100;
}

/**
 * One removable chip per non-default filter, so the teacher sees exactly what
 * is narrowing the list and can clear each singly.
 */
export function buildActiveChips(options: {
  criteria: ActiveChipCriteria;
  tab: Tab;
  setSearch: (value: string) => void;
  setTitleFilter: (value: string) => void;
  setResultFilter: (value: string) => void;
  setTimeFilter: (value: string) => void;
}): ActiveChip[] {
  const { criteria, tab } = options;
  const { search, titleFilter, resultFilter, timeFilter } = criteria;
  const chips: ActiveChip[] = [];
  if (search.trim()) {
    chips.push({
      key: "search",
      prefix: "Search:",
      label: search.trim(),
      onRemove: () => options.setSearch(""),
    });
  }
  if (titleFilter !== "all") {
    chips.push({
      key: "title",
      prefix: tab === "quizzes" ? "Quiz:" : "Interview:",
      label: titleFilter,
      onRemove: () => options.setTitleFilter("all"),
    });
  }
  if (resultFilter !== "all") {
    chips.push({
      key: "result",
      prefix: "Result:",
      label: RESULT_LABELS[resultFilter] ?? resultFilter,
      onRemove: () => options.setResultFilter("all"),
    });
  }
  if (timeFilter !== "all") {
    chips.push({
      key: "time",
      prefix: "Time:",
      label: TIME_LABELS[timeFilter] ?? timeFilter,
      onRemove: () => options.setTimeFilter("all"),
    });
  }
  return chips;
}

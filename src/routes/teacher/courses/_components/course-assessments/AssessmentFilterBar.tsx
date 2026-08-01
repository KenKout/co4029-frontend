import { Select } from "@/components/ui/select";

import {
  INTERVIEW_RESULT_OPTIONS,
  QUIZ_RESULT_OPTIONS,
  SHARED_RESULT_OPTIONS,
  TIME_OPTIONS,
} from "./constants";
import type { CourseAssessmentsController } from "./use-course-assessments-controller";

/**
 * Dropdown filters — title (which quiz / interview), result, and time
 * window. Mirrored across both tabs; the title options swap with the
 * active tab. Uses the shared styled Select (ui/select.tsx), which is
 * the app standard — native option lists are painted by the OS and
 * ignore the app's tokens entirely.
 *
 * Extracted verbatim from the former 458-line course-assessments.tsx.
 */
export function AssessmentFilterBar({
  controller,
}: {
  controller: CourseAssessmentsController;
}) {
  const {
    tab,
    quizTitles,
    interviewTitles,
    titleFilter,
    setTitleFilter,
    resultFilter,
    setResultFilter,
    timeFilter,
    setTimeFilter,
  } = controller;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={titleFilter}
        onValueChange={(next) => setTitleFilter(next)}
        className="w-52"
        options={[
          {
            value: "all",
            label: tab === "quizzes" ? "All quizzes" : "All interviews",
          },
          ...(tab === "quizzes" ? quizTitles : interviewTitles).map(
            (title) => ({
              value: title,
              label: title,
            }),
          ),
        ]}
      />

      <Select
        value={resultFilter}
        onValueChange={(next) => setResultFilter(next)}
        className="w-44"
        options={[
          ...SHARED_RESULT_OPTIONS,
          ...(tab === "quizzes"
            ? QUIZ_RESULT_OPTIONS
            : INTERVIEW_RESULT_OPTIONS),
        ]}
      />

      <Select
        value={timeFilter}
        onValueChange={(next) => setTimeFilter(next)}
        className="w-40"
        options={TIME_OPTIONS}
      />

      {(titleFilter !== "all" ||
        resultFilter !== "all" ||
        timeFilter !== "all") && (
        <button
          type="button"
          onClick={() => {
            setTitleFilter("all");
            setResultFilter("all");
            setTimeFilter("all");
          }}
          className="h-9 px-3 rounded-lg text-sm font-medium text-m3-on-surface-variant hover:bg-m3-surface-container transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

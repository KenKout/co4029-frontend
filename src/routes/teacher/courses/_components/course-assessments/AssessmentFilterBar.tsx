import { FilterBar, type FilterDef } from "@/components/ui/filter-bar";

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
 * active tab. Delegates to the shared FilterBar (ui/filter-bar.tsx) — the
 * same component the DataTableToolbar uses for its inline filters, so the
 * teacher pages and the admin tables share one filter implementation.
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

  const filterDefs: FilterDef[] = [
    {
      id: "title",
      label: tab === "quizzes" ? "Quiz" : "Interview",
      allLabel: tab === "quizzes" ? "All quizzes" : "All interviews",
      options: (tab === "quizzes" ? quizTitles : interviewTitles).map(
        (title) => ({ value: title, label: title }),
      ),
      className: "w-52",
    },
    {
      id: "result",
      label: "Result",
      allLabel: "All results",
      options: [
        ...SHARED_RESULT_OPTIONS,
        ...(tab === "quizzes"
          ? QUIZ_RESULT_OPTIONS
          : INTERVIEW_RESULT_OPTIONS),
      ],
      className: "w-44",
    },
    {
      id: "time",
      label: "Time",
      allLabel: "All time",
      options: TIME_OPTIONS,
      className: "w-40",
    },
  ];

  return (
    <FilterBar
      filters={filterDefs}
      values={{ title: titleFilter, result: resultFilter, time: timeFilter }}
      onChange={(filterId, value) => {
        if (filterId === "title") setTitleFilter(value);
        else if (filterId === "result") setResultFilter(value);
        else setTimeFilter(value);
      }}
      onResetAll={() => {
        setTitleFilter("all");
        setResultFilter("all");
        setTimeFilter("all");
      }}
    />
  );
}

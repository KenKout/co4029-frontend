import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      label:
        tab === "quizzes"
          ? t("teacher_assessments.quiz")
          : t("teacher_assessments.interview"),
      allLabel:
        tab === "quizzes"
          ? t("teacher_assessments.all_quizzes")
          : t("teacher_assessments.all_interviews"),
      options: (tab === "quizzes" ? quizTitles : interviewTitles).map(
        (title) => ({ value: title, label: title }),
      ),
      className: "w-52",
    },
    {
      id: "result",
      label: t("teacher_assessments.result"),
      allLabel: t("teacher_assessments.all_results"),
      options: [
        ...SHARED_RESULT_OPTIONS,
        ...(tab === "quizzes" ? QUIZ_RESULT_OPTIONS : INTERVIEW_RESULT_OPTIONS),
      ].map((option) => ({
        ...option,
        label: t(`teacher_assessments.options.${option.value}`),
      })),
      className: "w-44",
    },
    {
      id: "time",
      label: t("teacher_assessments.time"),
      allLabel: t("teacher_assessments.all_time"),
      options: TIME_OPTIONS.map((option) => ({
        ...option,
        label: t(`teacher_assessments.time_options.${option.value}`),
      })),
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

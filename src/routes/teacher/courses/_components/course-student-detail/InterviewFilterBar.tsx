import { FilterBar, type FilterDef } from "@/components/ui/filter-bar";
import { useTranslation } from "react-i18next";

import { INTERVIEW_RESULT_OPTIONS, INTERVIEW_TIME_OPTIONS } from "./constants";
import type { StudentInterviewFiltersController } from "./use-student-interview-filters";

/**
 * Interview / Result / Time dropdowns of the Interview Attempts section, plus
 * the Clear filters button. Delegates to the shared FilterBar (ui/filter-bar
 * .tsx) — the same component the course Assessments page and the
 * DataTableToolbar use, so teachers get the same filters everywhere with one
 * implementation.
 */
export function InterviewFilterBar({
  filters,
}: {
  filters: StudentInterviewFiltersController;
}) {
  const { t } = useTranslation();
  const {
    ivInterviewFilter,
    setIvInterviewFilter,
    ivResultFilter,
    setIvResultFilter,
    ivTimeFilter,
    setIvTimeFilter,
    ivInterviewTitles,
    clearIvFilters,
  } = filters;

  const filterDefs: FilterDef[] = [
    {
      id: "interview",
      label: t("teacher_course_student_detail.filters.by_interview"),
      allLabel: t("teacher_course_student_detail.filters.all_interviews"),
      options: ivInterviewTitles.map((title) => ({
        value: title,
        label: title,
      })),
      className: "w-44",
    },
    {
      id: "result",
      label: t("teacher_course_student_detail.filters.by_result"),
      allLabel: t("teacher_course_student_detail.filters.all_results"),
      options: INTERVIEW_RESULT_OPTIONS.map((option) => ({
        ...option,
        label: t(option.label),
      })),
      className: "w-40",
    },
    {
      id: "time",
      label: t("teacher_course_student_detail.filters.by_time"),
      allLabel: t("teacher_course_student_detail.filters.all_time"),
      options: INTERVIEW_TIME_OPTIONS.map((option) => ({
        ...option,
        label: t(option.label),
      })),
      className: "w-36",
    },
  ];

  return (
    <FilterBar
      filters={filterDefs}
      values={{
        interview: ivInterviewFilter,
        result: ivResultFilter,
        time: ivTimeFilter,
      }}
      onChange={(filterId, value) => {
        if (filterId === "interview") setIvInterviewFilter(value);
        else if (filterId === "result") setIvResultFilter(value);
        else setIvTimeFilter(value);
      }}
      onResetAll={clearIvFilters}
    />
  );
}

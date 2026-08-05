import { FilterBar, type FilterDef } from "@/components/ui/filter-bar";

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
      label: "Filter by interview",
      allLabel: "All interviews",
      options: ivInterviewTitles.map((title) => ({
        value: title,
        label: title,
      })),
      className: "w-44",
    },
    {
      id: "result",
      label: "Filter by result",
      allLabel: "All results",
      options: INTERVIEW_RESULT_OPTIONS,
      className: "w-40",
    },
    {
      id: "time",
      label: "Filter by time",
      allLabel: "All time",
      options: INTERVIEW_TIME_OPTIONS,
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

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

import { INTERVIEW_RESULT_OPTIONS, INTERVIEW_TIME_OPTIONS } from "./constants";
import type { StudentInterviewFiltersController } from "./use-student-interview-filters";

/**
 * Interview / Result / Time dropdowns of the Interview Attempts section, plus
 * the Clear filters button. Extracted verbatim from the former 659-line
 * course-student-detail.tsx — the controls mirror the course Assessments page
 * so teachers get the same filters in both places.
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
    ivFiltersActive,
    clearIvFilters,
  } = filters;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={ivInterviewFilter}
        onValueChange={(next) => setIvInterviewFilter(next)}
        size="sm"
        className="w-44"
        aria-label="Filter by interview"
        options={[
          { value: "all", label: "All interviews" },
          ...ivInterviewTitles.map((title) => ({
            value: title,
            label: title,
          })),
        ]}
      />
      <Select
        value={ivResultFilter}
        onValueChange={(next) => setIvResultFilter(next)}
        size="sm"
        className="w-40"
        aria-label="Filter by result"
        options={INTERVIEW_RESULT_OPTIONS}
      />
      <Select
        value={ivTimeFilter}
        onValueChange={(next) => setIvTimeFilter(next)}
        size="sm"
        className="w-36"
        aria-label="Filter by time"
        options={INTERVIEW_TIME_OPTIONS}
      />
      {ivFiltersActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={clearIvFilters}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

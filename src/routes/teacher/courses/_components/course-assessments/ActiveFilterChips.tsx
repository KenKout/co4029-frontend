import { X } from "lucide-react";

import type { CourseAssessmentsController } from "./use-course-assessments-controller";
import { Button } from "@/components/ui/button";

/**
 * Active-filter chips + Clear all — mirrors the courses page so the teacher can
 * see and remove each active filter at a glance. Extracted verbatim from the
 * former 458-line course-assessments.tsx; the caller still guards on
 * `activeChips.length > 0`.
 */
export function ActiveFilterChips({
  controller,
}: {
  controller: CourseAssessmentsController;
}) {
  const {
    activeChips,
    setTitleFilter,
    setResultFilter,
    setTimeFilter,
    setSearch,
  } = controller;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeChips.map((chip) => (
        <Button variant="ghost"
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary-fixed px-2.5 py-1 text-xs font-medium text-m3-primary transition-colors hover:bg-m3-primary/15 h-auto whitespace-normal"
        >
          <span className="text-m3-on-surface-variant">{chip.prefix}</span>
          {chip.label}
          <X className="h-3 w-3" />
        </Button>
      ))}
      <Button variant="link"
        type="button"
        onClick={() => {
          setTitleFilter("all");
          setResultFilter("all");
          setTimeFilter("all");
          setSearch("");
        }}
        className="text-xs font-medium text-m3-on-surface-variant underline underline-offset-2 hover:text-m3-on-surface"
      >
        Clear all
      </Button>
    </div>
  );
}

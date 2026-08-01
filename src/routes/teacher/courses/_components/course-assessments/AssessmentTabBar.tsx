import { Input } from "@/components/ui/input";

import type { Tab } from "./types";
import type { CourseAssessmentsController } from "./use-course-assessments-controller";

/**
 * Quizzes / Interviews pill switch plus the free-text filter. Extracted verbatim
 * from the former 458-line course-assessments.tsx, including the title reset on
 * tab switch.
 */
export function AssessmentTabBar({
  controller,
}: {
  controller: CourseAssessmentsController;
}) {
  const { tab, setTab, setTitleFilter, search, setSearch } = controller;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2">
        {(["quizzes", "interviews"] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              // Titles differ between tabs, so a title selection from the
              // other tab would filter everything out — reset on switch.
              setTitleFilter("all");
            }}
            className={
              tab === key
                ? "px-4 py-1.5 rounded-full text-sm font-medium bg-m3-primary text-white transition-colors"
                : "px-4 py-1.5 rounded-full text-sm font-medium bg-m3-surface-container text-m3-on-surface-variant hover:bg-m3-surface-container-high transition-colors"
            }
          >
            {key === "quizzes" ? "Quizzes" : "Interviews"}
          </button>
        ))}
      </div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by student or title…"
        className="max-w-xs h-9"
      />
    </div>
  );
}

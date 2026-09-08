import { Search, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * The roster's two empty states, extracted verbatim from the former 658-line
 * course-students.tsx. Two distinct weights on purpose: nothing is enrolled at
 * all vs. the filters simply hid everything.
 */

/** First-run — no enrollments exist yet. */
export function EmptyRosterState() {
  return (
    <EmptyState
      icon={Users}
      title="No students enrolled yet"
      description="Once students enroll in this course, they'll appear here with their progress and risk signals."
    />
  );
}

/** No-match — enrollments exist but filters/search hid them. */
export function NoMatchingStudentsState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No students match"
      description="Try a different search term or clear your filters."
      cta={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onClearFilters}
        >
          <X className="h-4 w-4" />
          Clear filters
        </Button>
      }
    />
  );
}

import { Search, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The roster's two empty states, extracted verbatim from the former 658-line
 * course-students.tsx. Two distinct weights on purpose: nothing is enrolled at
 * all vs. the filters simply hid everything.
 */

/** First-run — no enrollments exist yet. */
export function EmptyRosterState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center max-w-sm mx-auto">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-m3-primary-fixed">
        <Users className="h-7 w-7 text-m3-primary" />
      </div>
      <p className="text-base font-headline font-bold text-m3-on-surface">
        No students enrolled yet
      </p>
      <p className="text-sm text-m3-on-surface-variant">
        Once students enroll in this course, they'll appear here with their
        progress and risk signals.
      </p>
    </div>
  );
}

/** No-match — enrollments exist but filters/search hid them. */
export function NoMatchingStudentsState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-m3-on-surface-variant">
      <Search className="h-10 w-10 opacity-30" />
      <p className="text-sm font-medium text-m3-on-surface">
        No students match
      </p>
      <p className="text-xs">
        Try a different search term or clear your filters.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-1 gap-2"
        onClick={onClearFilters}
      >
        <X className="h-4 w-4" />
        Clear filters
      </Button>
    </div>
  );
}

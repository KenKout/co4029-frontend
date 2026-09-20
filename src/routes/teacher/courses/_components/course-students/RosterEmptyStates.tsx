import { Search, Users, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * The roster's two empty states, extracted verbatim from the former 658-line
 * course-students.tsx. Two distinct weights on purpose: nothing is enrolled at
 * all vs. the filters simply hid everything.
 */

/** First-run — no enrollments exist yet. */
export function EmptyRosterState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Users}
      title={t("teacher_course_students.empty.title")}
      description={t("teacher_course_students.empty.description")}
    />
  );
}

/** No-match — enrollments exist but filters/search hid them. */
export function NoMatchingStudentsState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Search}
      title={t("teacher_course_students.no_match.title")}
      description={t("teacher_course_students.no_match.description")}
      cta={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onClearFilters}
        >
          <X className="h-4 w-4" />
          {t("teacher_course_students.clear_filters")}
        </Button>
      }
    />
  );
}

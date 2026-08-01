import { useTranslation } from "react-i18next";
import { BookOpen, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The two empty states of the Courses index, extracted verbatim from the former
 * 234-line courses.tsx.
 */

/** First-run — no courses exist yet. Warm intro + primary CTA. */
export function CoursesFirstRunState() {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <div className="flex h-14 w-14 mx-auto mb-4 items-center justify-center rounded-2xl bg-m3-primary-fixed">
        <BookOpen className="h-7 w-7 text-m3-primary" />
      </div>
      <p className="text-base font-headline font-bold text-m3-on-surface">
        {t("teacher_courses_list.empty_first_title")}
      </p>
      <p className="text-sm text-m3-on-surface-variant mt-2">
        {t("teacher_courses_list.empty_first_body")}
      </p>
    </div>
  );
}

/**
 * No-match — courses exist but the search/filter excluded them all.
 * Offer a Clear filters escape hatch right where the teacher looks.
 */
export function CoursesNoMatchState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16 text-m3-on-surface-variant">
      <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
      <p className="text-sm font-medium text-m3-on-surface">
        {t("teacher_courses_list.no_match_title")}
      </p>
      <p className="text-xs mt-1">{t("teacher_courses_list.no_match_body")}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 gap-2"
        onClick={onClearFilters}
      >
        <X className="h-4 w-4" />
        {t("teacher_courses_list.clear_filters")}
      </Button>
    </div>
  );
}

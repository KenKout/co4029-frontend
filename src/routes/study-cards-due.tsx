import { useEffect, useMemo } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Play } from "lucide-react";
import { useCardsDue } from "@/lib/api/hooks/spaced-repetition";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { CardsDueCourseSection } from "@/routes/_components/study-cards-due/CardsDueCourseSection";
import { CardsDueEmptyState } from "@/routes/_components/study-cards-due/CardsDueScreens";
import {
  groupByCourse,
  MAX_AUTODRAIN_PAGES,
} from "@/routes/_components/study-cards-due/helpers";

/**
 * The due-cards overview: course → lesson counts plus a single "Start review"
 * action. The grouping helper and the per-course section live in
 * `_components/study-cards-due/`.
 */
export default function StudyCardsDuePage() {
  const { t } = useTranslation();
  // Deep-link scoping: the SR reminder builds `?lesson={id}` for a single-lesson
  // backlog; a per-course "Review" builds `?course={slug}`. Honour both so the
  // counts a student lands on match what they clicked, not the whole backlog.
  const { lesson, course } = useSearch({ strict: false }) as {
    lesson?: string;
    course?: string;
  };
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useCardsDue({ limit: 100, lessonId: lesson, courseSlug: course });

  // Drain remaining pages so the grouped counts reflect the TRUE backlog rather
  // than the first 100 due cards — a count that lies undercuts the "finishable
  // goal" framing. Bounded so a pathological backlog can't loop forever; past
  // the cap we render the count with a trailing "+".
  const pagesDrained = Math.ceil(items.length / 100);
  useEffect(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      pagesDrained < MAX_AUTODRAIN_PAGES
    ) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, pagesDrained, fetchNextPage]);

  const groups = useMemo(() => groupByCourse(items), [items]);
  const total = items.length;
  const approx = hasNextPage; // hit the drain cap — counts are a floor

  // Carry the active scope onto the top-level review link so "Start review"
  // resolves the same cards the student is looking at. Both keys are always
  // present (undefined when unset) to satisfy the route's search-param shape.
  const reviewSearch = useMemo<{
    lesson: string | undefined;
    course: string | undefined;
  }>(() => ({ lesson, course }), [lesson, course]);

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-3xl mx-auto pb-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/sr"
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label={t("study_cards_due.back", "Back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title={t("study_cards_due.title", "Cards due")}
            subtitle={
              isLoading
                ? t("study_cards_due.loading", "Loading…")
                : total === 0
                  ? t("study_cards_due.empty_subtitle", "You're all caught up")
                  : t("study_cards_due.summary", {
                      count: total,
                      courses: groups.length,
                      defaultValue:
                        "{{count}} card(s) to review across {{courses}} course(s)",
                    })
            }
          />
        </div>

        {total === 0 && !isLoading ? (
          <CardsDueEmptyState />
        ) : (
          <>
            {/* Primary action: resolve the queue in order (most-overdue first).
                No per-card list to pick from — you review what's next. */}
            {total > 0 && (
              <Link to="/study/review" search={reviewSearch} className="block">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 cursor-pointer bg-m3-primary text-white"
                >
                  <Play className="h-4 w-4" />
                  {t("study_cards_due.start_review", {
                    count: total,
                    defaultValue: "Start review ({{count}})",
                  })}
                  {approx ? "+" : ""}
                </Button>
              </Link>
            )}

            <div className="space-y-4">
              {groups.map((group) => (
                <CardsDueCourseSection key={group.courseSlug} group={group} />
              ))}
            </div>

            {isFetchingNextPage && (
              <p className="text-center text-xs text-m3-on-surface-variant">
                {t("study_cards_due.loading", "Loading…")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

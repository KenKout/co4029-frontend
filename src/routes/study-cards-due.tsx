import { useEffect, useMemo } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Inbox, Layers, Play } from "lucide-react";
import { useCardsDue } from "@/lib/api/hooks/spaced-repetition";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { CardDue } from "@/lib/api/types";

/**
 * Group the flat due list into course → lesson counts.
 *
 * Deliberately a COUNT view, not a browsable card list. Two reasons, both
 * pedagogical rather than cosmetic:
 *   1. A per-card list invites cherry-picking — students skip the cards they
 *      dread, which is exactly what breaks spaced repetition. Counts + a single
 *      "Review" action keep the queue order authoritative (most-overdue first,
 *      enforced server-side).
 *   2. We do NOT surface per-card recall strength / EF here. EF is an internal
 *      scheduler parameter; showing "strong" on a card that's due reads as a
 *      bug (you review at the edge of forgetting — that's the point) and
 *      priming a student's expectation before they attempt changes how they
 *      attempt. Anki shows nothing about a card before you try it; we match.
 */
interface LessonBucket {
  lessonId: string;
  lessonTitle: string;
  count: number;
}
interface CourseBucket {
  courseSlug: string;
  courseTitle: string;
  count: number;
  lessons: LessonBucket[];
}

function groupByCourse(cards: CardDue[]): CourseBucket[] {
  const courses = new Map<
    string,
    { title: string; lessons: Map<string, LessonBucket> }
  >();
  for (const card of cards) {
    let course = courses.get(card.course_slug);
    if (!course) {
      course = { title: card.course_title, lessons: new Map() };
      courses.set(card.course_slug, course);
    }
    const lesson = course.lessons.get(card.lesson_id);
    if (lesson) {
      lesson.count += 1;
    } else {
      course.lessons.set(card.lesson_id, {
        lessonId: card.lesson_id,
        lessonTitle: card.lesson_title,
        count: 1,
      });
    }
  }
  return [...courses.entries()]
    .map(([slug, c]) => {
      const lessons = [...c.lessons.values()].sort((a, b) => b.count - a.count);
      return {
        courseSlug: slug,
        courseTitle: c.title,
        count: lessons.reduce((n, l) => n + l.count, 0),
        lessons,
      };
    })
    .sort((a, b) => b.count - a.count);
}

// Cap on how many extra pages we auto-drain to make the counts accurate. At
// limit=100/page this covers a 1,000-card backlog before we stop and show "+".
const MAX_AUTODRAIN_PAGES = 10;

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
          <EmptyState
            icon={Inbox}
            title={t("study_cards_due.empty_title", "Nothing due right now")}
            description={t(
              "study_cards_due.empty_body",
              "Your reviews are all caught up. New cards appear here when they're due.",
            )}
            cta={
              <Link to="/dashboard/sr">
                <Button variant="default" className="cursor-pointer">
                  {t("study_cards_due.back_to_dashboard", "Back to dashboard")}
                </Button>
              </Link>
            }
          />
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

            {/* Course → lesson COUNTS. A lesson with 4 due cards shows once as
                "4 due", not four indistinguishable rows. */}
            <div className="space-y-4">
              {groups.map((group) => (
                <section
                  key={group.courseSlug}
                  className="rounded-xl ghost-border bg-m3-surface-container-lowest overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-m3-outline-variant/20">
                    <Layers className="h-4 w-4 text-m3-primary shrink-0" />
                    <h2 className="text-sm font-headline font-bold text-m3-on-surface min-w-0 truncate">
                      {group.courseTitle}
                    </h2>
                    <span className="text-xs font-semibold text-m3-on-surface-variant whitespace-nowrap">
                      {t("study_cards_due.group_count", {
                        count: group.count,
                        defaultValue: "{{count}} due",
                      })}
                    </span>
                    <Link
                      to="/study/review"
                      search={{ lesson: undefined, course: group.courseSlug }}
                      className="ml-auto shrink-0 text-xs font-semibold text-m3-primary hover:underline"
                    >
                      {t("study_cards_due.review_course", "Review")}
                    </Link>
                  </div>
                  <ul className="divide-y divide-m3-outline-variant/10">
                    {group.lessons.map((l) => (
                      <li
                        key={l.lessonId}
                        className="flex items-center gap-3 px-4 py-2.5"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-m3-primary-fixed">
                          <BookOpen className="h-4 w-4 text-m3-primary" />
                        </div>
                        <span className="flex-1 min-w-0 truncate text-sm text-m3-on-surface">
                          {l.lessonTitle}
                        </span>
                        <span className="text-xs font-semibold text-m3-on-surface-variant tabular-nums whitespace-nowrap">
                          {t("study_cards_due.lesson_count", {
                            count: l.count,
                            defaultValue: "{{count}} due",
                          })}
                        </span>
                        <Link
                          to="/study/review"
                          search={{ lesson: l.lessonId, course: undefined }}
                          className="text-xs font-semibold text-m3-primary hover:underline shrink-0"
                        >
                          {t("study_cards_due.review_course", "Review")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
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

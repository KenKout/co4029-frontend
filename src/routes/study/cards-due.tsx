import { useEffect, useMemo } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Play } from "lucide-react";
import {
  lessonScopeFromParam,
  useCardsDue,
} from "@/lib/api/hooks/spaced-repetition";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { CardsDueCourseSection } from "@/routes/study/_components/cards-due/CardsDueCourseSection";
import { CardsDueEmptyState } from "@/routes/study/_components/cards-due/CardsDueScreens";
import {
  groupByCourse,
  MAX_AUTODRAIN_PAGES,
  sessionSize,
  SEVERE_OVERDUE_DAYS,
  summarizeBacklog,
} from "@/routes/study/_components/cards-due/helpers";

/**
 * The backlog-at-a-glance card: "31 cards due now" + composition. Colours
 * follow the lateness convention — orange overdue, red overdue by 7+ days
 * (the subset is phrased as a SUBSET, never as a second independent
 * group: "31 overdue · 30 overdue by 7+ days", so the two never sum to
 * an imaginary 61). "Due today" is the normal SM-2 state and stays
 * neutral; red is never used for the whole backlog.
 */
function DueSummaryCard({
  total,
  approx,
  summary,
  session,
  courses,
}: {
  total: number;
  approx: boolean;
  summary: ReturnType<typeof summarizeBacklog>;
  session: number;
  courses: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl ghost-border bg-m3-surface-container-lowest px-5 py-4">
      <p className="text-2xl font-headline font-bold text-m3-on-surface">
        {total === 1
          ? t("study_cards_due.now_one", { count: 1 })
          : t("study_cards_due.now_other", { count: total })}
        {approx ? "+" : ""}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-m3-on-surface-variant">
        {summary.overdue > 0 ? (
          <>
            <span className="font-bold text-orange-600">
              {summary.overdue === 1
                ? t("study_cards_due.overdue_one")
                : t("study_cards_due.overdue_other", {
                    count: summary.overdue,
                  })}
            </span>
            {summary.severe > 0 ? (
              <span className="font-bold text-red-600">
                {summary.severe === 1
                  ? t("study_cards_due.severe_one", {
                      days: SEVERE_OVERDUE_DAYS,
                    })
                  : t("study_cards_due.severe_other", {
                      count: summary.severe,
                      days: SEVERE_OVERDUE_DAYS,
                    })}
              </span>
            ) : null}
          </>
        ) : (
          <span>
            {summary.dueToday === 1
              ? t("study_cards_due.today_one")
              : t("study_cards_due.today_other", {
                  count: summary.dueToday,
                })}
          </span>
        )}
        <span aria-hidden="true">·</span>
        <span>
          {courses === 1
            ? t("study_cards_due.across_one", { count: courses })
            : t("study_cards_due.across_other", { count: courses })}
        </span>
      </p>
      {total > session ? (
        <p className="mt-1 text-xs font-medium text-m3-on-surface-variant">
          {session === 1
            ? t("study_cards_due.session_one", { count: session })
            : t("study_cards_due.session_other", { count: session })}
          {" · "}
          {total - session === 1
            ? t("study_cards_due.remain_one", { count: total - session })
            : t("study_cards_due.remain_other", {
                count: total - session,
              })}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The due-cards overview: course → lesson counts plus a "Start review"
 * action. The grouping helper and the per-course section live in
 * `_components/study-cards-due/`.
 *
 * Content model, one form for every number on the page:
 * `[count] + card(s) + state` — "1 card due", "12 cards overdue", and
 * verbs on CTAs ("Review 7 cards", "Start 20-card review"). The review
 * session caps at SESSION_CARD_LIMIT cards, so the summary always splits
 * "due now" from "in this session" and the CTA carries the SESSION count.
 */
export default function StudyCardsDuePage() {
  const { t } = useTranslation();
  // Deep-link scoping: the SR reminder builds `?lesson={id}` for a single-lesson
  // backlog; a per-course "Review" builds `?course={slug}`. Honour both so the
  // counts a student lands on match what they clicked, not the whole backlog.
  const { lesson, course } = useSearch({ strict: false });
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useCardsDue({ limit: 100, ...lessonScopeFromParam(lesson), courseSlug: course });

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
  const summary = useMemo(() => summarizeBacklog(items), [items]);
  const total = items.length;
  const approx = hasNextPage; // hit the drain cap — counts are a floor
  const session = sessionSize(total);

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
            title={t("study_cards_due.title", "Cards due for review")}
            subtitle={
              isLoading
                ? t("study_cards_due.loading", "Loading…")
                : total === 0
                  ? t("study_cards_due.empty_subtitle", "You're all caught up")
                  : undefined
            }
          />
        </div>

        {total === 0 && !isLoading ? (
          <CardsDueEmptyState />
        ) : (
          <>
            {/* Summary: the backlog at a glance. One number per line, the
                composition coloured by lateness — orange overdue, red
                severely overdue. "Due today" is the normal SM-2 state and
                stays neutral; red is NOT used for the whole backlog. */}
            {!isLoading && total > 0 && (
              <DueSummaryCard
                total={total}
                approx={approx}
                summary={summary}
                session={session}
                courses={groups.length}
              />
            )}

            {/* Primary action: the session serves at most SESSION_CARD_LIMIT
                cards, so the label says the session size — never "Start
                review (31)" on a 20-card session. */}
            {total > 0 && (
              <Link to="/study/review" search={reviewSearch} className="block">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 cursor-pointer bg-m3-primary text-white"
                >
                  <Play className="h-4 w-4" />
                  {session === 1
                    ? t("study_cards_due.start_one", { count: 1 })
                    : t("study_cards_due.start_other", { count: session })}
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
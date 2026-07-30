import { useMemo } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, BookOpen, Inbox, Layers, Play } from "lucide-react";
import { useCardsDue } from "@/lib/api/hooks/spaced-repetition";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { CardDue } from "@/lib/api/types";

/**
 * Turn the internal SM-2 EF (1.3–2.5) into a plain-language recall strength the
 * student can act on. EF is the algorithm's confidence that the student knows
 * the card; we bucket it into three human labels rather than showing "EF 1.70".
 */
function recallStrength(ef: number): { label: string; tone: string } {
  if (ef >= 2.3) return { label: "strong", tone: "text-emerald-700 bg-emerald-50" };
  if (ef >= 1.8) return { label: "building", tone: "text-amber-700 bg-amber-50" };
  return { label: "shaky", tone: "text-red-700 bg-red-50" };
}

/** Group the flat due list by course so the student sees structure, not noise. */
function groupByCourse(cards: CardDue[]) {
  const groups = new Map<string, { title: string; slug: string; cards: CardDue[] }>();
  for (const card of cards) {
    const key = card.course_slug;
    const existing = groups.get(key);
    if (existing) {
      existing.cards.push(card);
    } else {
      groups.set(key, {
        title: card.course_title,
        slug: card.course_slug,
        cards: [card],
      });
    }
  }
  return [...groups.values()].sort((a, b) => b.cards.length - a.cards.length);
}

export default function StudyCardsDuePage() {
  const { t } = useTranslation();
  // Deep-link scoping: the SR reminder builds `?lesson={id}` for a single-lesson
  // backlog; a per-course "Review" builds `?course={slug}`. Honour both so the
  // list a student lands on matches what they clicked, instead of the whole
  // backlog every time.
  const { lesson, course } = useSearch({ strict: false }) as {
    lesson?: string;
    course?: string;
  };
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useCardsDue({ limit: 100, lessonId: lesson, courseSlug: course });

  const groups = useMemo(() => groupByCourse(items), [items]);

  // Carry the active scope onto the review links so "Start review" resolves the
  // same cards the student is looking at. Both keys are always present (as
  // undefined when unset) to satisfy the route's search-param shape.
  const reviewSearch = useMemo<{ lesson: string | undefined; course: string | undefined }>(
    () => ({ lesson, course }),
    [lesson, course],
  );

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto pb-6 space-y-6">
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
                : items.length === 0
                  ? t("study_cards_due.empty_subtitle", "You're all caught up")
                  : t("study_cards_due.summary", {
                      count: items.length,
                      courses: groups.length,
                      defaultValue:
                        "{{count}} card(s) to review across {{courses}} course(s)",
                    })
            }
          />
        </div>

        {items.length === 0 && !isLoading ? (
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
            {/* Primary action: resolve the whole queue in a review session. */}
            {items.length > 0 && (
              <Link
                to="/study/review"
                search={reviewSearch}
                className="inline-block"
              >
                <Button
                  size="lg"
                  className="gap-2 cursor-pointer bg-m3-primary text-white"
                >
                  <Play className="h-4 w-4" />
                  {t("study_cards_due.start_review", {
                    count: items.length,
                    defaultValue: "Start review ({{count}})",
                  })}
                </Button>
              </Link>
            )}

            {/* Grouped by course so the list reads as structure, not a wall. */}
            <div className="space-y-5">
              {groups.map((group) => (
                <section key={group.slug} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <Layers className="h-4 w-4 text-m3-primary" />
                    <h2 className="text-sm font-headline font-bold text-m3-on-surface">
                      {group.title}
                    </h2>
                    <span className="text-xs font-semibold text-m3-on-surface-variant">
                      {t("study_cards_due.group_count", {
                        count: group.cards.length,
                        defaultValue: "{{count}} due",
                      })}
                    </span>
                    <Link
                      to="/study/review"
                      search={{ lesson: undefined, course: group.slug }}
                      className="ml-auto text-xs font-semibold text-m3-primary hover:underline"
                    >
                      {t("study_cards_due.review_course", "Review")}
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {group.cards.map((card) => (
                      <CardDueRow key={card.question_id} card={card} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="cursor-pointer"
                >
                  {isFetchingNextPage
                    ? t("study_cards_due.loading", "Loading…")
                    : t("study_cards_due.load_more", "Load more")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CardDueRow({ card }: { card: CardDue }) {
  const { t } = useTranslation();
  const strength = recallStrength(card.ef);
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-m3-primary-fixed">
        <BookOpen className="h-5 w-5 text-m3-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface truncate">
          {card.lesson_title}
        </p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${strength.tone}`}
          >
            {t(`study_cards_due.strength.${strength.label}`, {
              defaultValue: strength.label,
            })}
          </span>
          <span className="text-xs text-m3-on-surface-variant">
            {t("study_cards_due.recall_hint", "recall strength")}
          </span>
        </div>
      </div>
    </div>
  );
}

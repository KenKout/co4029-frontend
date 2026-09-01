import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BookOpen, ChevronRight, Layers } from "lucide-react";

import { cn } from "@/lib/utils";

import type { CourseBucket, LessonBucket } from "./helpers";

/** Local alias for the `t` function (project convention). */
type TranslateFn = ReturnType<typeof useTranslation>["t"];

/**
 * Right-aligned fixed count column shared by course + lesson rows. On
 * hover/focus the count cross-fades OUT while the verb CTA fades IN over
 * the same spot — the two never render on top of each other.
 */
function CountColumn({
  children,
  cta,
  className,
}: {
  children: React.ReactNode;
  cta: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex w-52 shrink-0 items-center justify-end text-right tabular-nums whitespace-nowrap",
        className,
      )}
    >
      <span className="min-w-0 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0">
        {children}
      </span>
      {cta}
    </span>
  );
}

/** Hover/focus CTA that overlays the count column (zero layout shift). */
function RowCta({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center justify-end gap-1 text-xs font-semibold text-m3-primary",
        "pointer-events-none opacity-0 transition-opacity",
        "group-hover:opacity-100 group-focus-visible:opacity-100",
      )}
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5" />
    </span>
  );
}

/**
 * "N card(s) due" — the content-model form `[count] + card(s) + state`.
 * Explicit singular/plural branches (i18next count plurals do not resolve
 * in this app's config).
 */
function dueLabel(t: TranslateFn, n: number): string {
  return n === 1
    ? t("study_cards_due.due_one", { count: n })
    : t("study_cards_due.due_other", { count: n });
}

/** Verb + count CTA ("Review 7 cards"), same plural discipline. */
function reviewLabel(t: TranslateFn, n: number): string {
  return n === 1
    ? t("study_cards_due.review_cta_one", { count: n })
    : t("study_cards_due.review_cta_other", { count: n });
}

/** One lesson row — the whole row is the review link, count pinned right. */
function LessonRow({ lesson, courseSlug }: { lesson: LessonBucket; courseSlug: string }) {
  const { t } = useTranslation();
  return (
    <li>
      <Link
        to="/study/review"
        // Slug pair, not the lesson UUID: the lesson slug is unique per
        // MODULE, so it only identifies a lesson when paired with its course.
        search={{ lesson: lesson.lessonSlug, course: courseSlug }}
        className="group flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-m3-surface-container-low focus-visible:bg-m3-surface-container-low"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-m3-primary-fixed">
          <BookOpen className="h-4 w-4 text-m3-primary" />
        </div>
        <span className="min-w-0 flex-1 truncate text-sm text-m3-on-surface">
          {lesson.lessonTitle}
        </span>
        <CountColumn
          cta={<RowCta>{reviewLabel(t, lesson.count)}</RowCta>}
          className="text-xs font-semibold text-m3-on-surface-variant"
        >
          {dueLabel(t, lesson.count)}
        </CountColumn>
      </Link>
    </li>
  );
}

/**
 * Course → lesson COUNTS. A lesson with 4 due cards shows once as
 * "4 cards due", not four indistinguishable rows.
 *
 * The course header is itself the review link for the whole course: the
 * count column pins the backlog size (plus the overdue subset, orange — or
 * red when any card is severely overdue), and a verb CTA takes over that
 * column on hover/focus instead of a permanently-repeated "Review" text.
 */
export function CardsDueCourseSection({ group }: { group: CourseBucket }) {
  const { t } = useTranslation();
  const tone =
    group.severe > 0 ? "text-red-600" : group.overdue > 0 ? "text-orange-600" : "text-m3-on-surface-variant";

  return (
    <section className="overflow-hidden rounded-xl bg-m3-surface-container-lowest ghost-border">
      <Link
        to="/study/review"
        search={{ lesson: undefined, course: group.courseSlug }}
        className="group flex items-center gap-2 border-b border-m3-outline-variant/20 px-4 py-3 transition-colors hover:bg-m3-surface-container-low focus-visible:bg-m3-surface-container-low"
      >
        <Layers className="h-4 w-4 shrink-0 text-m3-primary" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-headline font-bold text-m3-on-surface">
          {group.courseTitle}
        </h2>
        <CountColumn
          cta={<RowCta>{reviewLabel(t, group.count)}</RowCta>}
          className="text-xs font-semibold text-m3-on-surface-variant"
        >
          <span>
            {dueLabel(t, group.count)}
            {group.overdue > 0 ? (
              <>
                {" · "}
                <span className={cn("font-bold", tone)}>
                  {group.overdue === 1
                    ? t("study_cards_due.overdue_one")
                    : t("study_cards_due.overdue_other", {
                        count: group.overdue,
                      })}
                </span>
              </>
            ) : null}
          </span>
        </CountColumn>
      </Link>
      <ul className="divide-y divide-m3-outline-variant/10">
        {group.lessons.map((l) => (
          <LessonRow key={l.lessonId} lesson={l} courseSlug={group.courseSlug} />
        ))}
      </ul>
    </section>
  );
}
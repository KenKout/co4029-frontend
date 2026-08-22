import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BookOpen, Layers } from "lucide-react";
import type { CourseBucket, LessonBucket } from "./helpers";

/** One lesson row inside a course section. */
function LessonRow({ lesson }: { lesson: LessonBucket }) {
  const { t } = useTranslation();
  const l = lesson;
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
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
  );
}

/**
 * Course → lesson COUNTS. A lesson with 4 due cards shows once as
 * "4 due", not four indistinguishable rows.
 */
export function CardsDueCourseSection({ group }: { group: CourseBucket }) {
  const { t } = useTranslation();

  return (
    <section className="rounded-xl ghost-border bg-m3-surface-container-lowest overflow-hidden">
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
          <LessonRow key={l.lessonId} lesson={l} />
        ))}
      </ul>
    </section>
  );
}

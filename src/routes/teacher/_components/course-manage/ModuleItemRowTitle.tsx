import { Link } from "@tanstack/react-router";
import type { CourseContentItem } from "@/lib/api/types/common";

/**
 * The row's title cell: a link to the matching editor for lesson / quiz /
 * interview items, or a plain span when the item has no target id.
 *
 * The link is a STRETCHED link (`after:absolute after:inset-0`): its invisible
 * ::after covers the whole row, so the entire row area opens the item instead of
 * only the few characters of the title. The row already changed background on
 * hover, which advertised a target that was not actually there — clicking beside
 * the title did nothing. Because the ::after belongs to the anchor, hovering
 * anywhere in the row also counts as hovering the link, so the title colour
 * responds too (no `group-hover` needed).
 *
 * The row must be `relative` for this to work, and every control that has to
 * stay clickable (drag grip, publish, edit, duplicate) must sit above the
 * overlay with `relative z-10` — see `ModuleItemRow`.
 */
const TITLE_CLASS =
  "flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer after:absolute after:inset-0 after:rounded-xl after:content-['']";

export function ModuleItemRowTitle({
  item,
  courseId,
  title,
}: {
  item: CourseContentItem;
  courseId: string;
  title: string;
}) {
  return item.item_type === "lesson" && item.lesson_id ? (
    <Link
      to="/teacher/courses/$courseId/lessons/$lessonId"
      params={{ courseId, lessonId: item.lesson_id }}
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      className={TITLE_CLASS}
    >
      {title}
    </Link>
  ) : item.item_type === "quiz" && item.quiz_id ? (
    <Link
      to="/teacher/courses/$courseId/quizzes/$quizId"
      params={{ courseId, quizId: item.quiz_id }}
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      className={TITLE_CLASS}
    >
      {title}
    </Link>
  ) : item.item_type === "interview" && item.interview_config_id ? (
    <Link
      to="/teacher/courses/$courseId/interview-configs/$configId"
      params={{ courseId, configId: item.interview_config_id }}
      search={{ tab: undefined }}
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      className={TITLE_CLASS}
    >
      {title}
    </Link>
  ) : (
    <span className="flex-1 text-xs font-medium text-m3-on-surface truncate">
      {title}
    </span>
  );
}

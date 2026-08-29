import { Link } from "@tanstack/react-router";
import type { CourseContentItem } from "@/lib/api/types/common";

/**
 * The row's title cell: a link to the matching editor for lesson / quiz /
 * interview items, or a plain span when the item has no target id. Carried
 * verbatim out of the former inline chain in `ModuleItemRow`.
 */
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
      className="flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
    >
      {title}
    </Link>
  ) : item.item_type === "quiz" && item.quiz_id ? (
    <Link
      to="/teacher/courses/$courseId/quizzes/$quizId"
      params={{ courseId, quizId: item.quiz_id }}
      draggable={false}
      onClick={(e) => e.stopPropagation()}
      className="flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
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
      className="flex-1 text-xs font-medium text-m3-on-surface truncate hover:text-m3-primary transition-colors cursor-pointer"
    >
      {title}
    </Link>
  ) : (
    <span className="flex-1 text-xs font-medium text-m3-on-surface truncate">
      {title}
    </span>
  );
}

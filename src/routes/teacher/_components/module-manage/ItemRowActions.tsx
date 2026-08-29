import { Link } from "@tanstack/react-router";
import { BarChart3, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CourseContentItem } from "@/lib/api/types/common";
import type { TranslateFn } from "./types";

/**
 * Trailing action cluster of a curriculum row: an edit link per item type, the
 * quiz results shortcut, and the destructive delete which hands the title up to
 * the page so its `ConfirmDialog` can name the item. Moved verbatim out of
 * `ItemRow`.
 */
export function ItemRowActions({
  item,
  courseId,
  title,
  t,
  onDelete,
}: {
  item: CourseContentItem;
  courseId: string;
  title: string;
  t: TranslateFn;
  onDelete: (title: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-m3-on-surface-variant shrink-0">
      {item.item_type === "lesson" && item.lesson_id && (
        <Link
          to="/teacher/courses/$courseId/lessons/$lessonId"
          params={{ courseId, lessonId: item.lesson_id }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-m3-on-surface"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
      {item.item_type === "quiz" && item.quiz_id && (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId/results"
          params={{ courseId, quizId: item.quiz_id }}
          onClick={(e) => e.stopPropagation()}
          title={t("teacher_quiz_manage.actions.view_results")}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-m3-on-surface"
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
      {item.item_type === "quiz" && item.quiz_id && (
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId, quizId: item.quiz_id }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-m3-on-surface"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
      {item.item_type === "interview" && item.interview_config_id && (
        <Link
          to="/teacher/courses/$courseId/interview-configs/$configId"
          params={{ courseId, configId: item.interview_config_id }}
          search={{ tab: undefined }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-m3-on-surface"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </Link>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-m3-error hover:bg-m3-error/10"
        title={t("teacher_common.delete_item")}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(title);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

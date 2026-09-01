import { Link } from "@tanstack/react-router";
import { Copy, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CourseContentItem } from "@/lib/api/types/common";
import type { TranslateFn } from "./types";
import type { useModuleItemRow } from "./use-module-item-row";

/**
 * Trailing action cluster of a curriculum row: an edit link per item type plus
 * the duplicate button. Moved verbatim out of `ModuleItemRow`; the duplicate
 * mutation still comes from the row's hook so its pending state is shared.
 */
export function ModuleItemRowActions({
  item,
  courseId,
  duplicateItem,
  onDuplicate,
  t,
}: {
  item: CourseContentItem;
  courseId: string;
  duplicateItem: ReturnType<typeof useModuleItemRow>["duplicateItem"];
  onDuplicate: (e: React.MouseEvent) => void;
  t: TranslateFn;
}) {
  return (
    <div className="flex items-center gap-1 text-m3-on-surface-variant relative z-10">
      {item.item_type === "lesson" && item.lesson_id && (
        <Link
          to="/teacher/courses/$courseId/lessons/$lessonId"
          params={{ courseId, lessonId: item.lesson_id }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-m3-on-surface"
          >
            <Pencil className="h-3 w-3" />
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
            className="h-6 w-6 hover:text-m3-on-surface"
          >
            <Pencil className="h-3 w-3" />
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
            className="h-6 w-6 hover:text-m3-on-surface"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </Link>
      )}
      {/* Duplicate this item: deep-clones the lesson/quiz/interview as an
          independent draft and appends a new pin to the module. */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 hover:text-m3-on-surface"
        onClick={onDuplicate}
        disabled={duplicateItem.isPending}
        title={t("teacher_common.duplicate_item", "Duplicate")}
        aria-label={t("teacher_common.duplicate_item", "Duplicate")}
      >
        {duplicateItem.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

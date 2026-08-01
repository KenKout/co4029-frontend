import { useState } from "react";
import { toast } from "sonner";
import { usePublishInterviewConfig } from "@/lib/api/hooks/interviews";
import { usePublishQuiz } from "@/lib/api/hooks/quizzes";
import {
  useDuplicateModuleItem,
  useUpdateLesson,
} from "@/lib/api/hooks/teacher-courses";
import type { CourseContentItem } from "@/lib/api/types/common";
import type { TranslateFn } from "./types";

/**
 * The mutable half of a curriculum row: the drag-arming flag, the three
 * per-type publish mutations, the duplicate mutation, and the two click
 * handlers that drive them.
 *
 * Extracted from the former 254-line / complexity-56 `ModuleItemRow`. The hook
 * calls keep their original relative order (`useState`, `useUpdateLesson`,
 * `usePublishQuiz`, `usePublishInterviewConfig`, `useDuplicateModuleItem`) so
 * the row's hook slots are unchanged, and every expression is carried over
 * character-for-character.
 */
export function useModuleItemRow(options: {
  item: CourseContentItem;
  courseId: string;
  title: string;
  t: TranslateFn;
}) {
  const { item, courseId, title, t } = options;
  // Dragging is armed only while the grip handle is held (see the handle
  // button in the row) so the row's title link + buttons remain clickable.
  const [dragEnabled, setDragEnabled] = useState(false);
  // Inline publish (T#2): publish a draft item without opening it. Publishing
  // is the stated pain point and every item type supports it; unpublish is not
  // uniformly exposed (quizzes have no unpublish route), so the inline control
  // is publish-only — a published item shows a static status badge.
  const publishLesson = useUpdateLesson(item.lesson_id ?? "", courseId);
  const publishQuiz = usePublishQuiz(item.quiz_id ?? undefined);
  const publishInterview = usePublishInterviewConfig(
    item.interview_config_id ?? undefined,
  );
  const duplicateItem = useDuplicateModuleItem(courseId);

  function handleDuplicateItem(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    duplicateItem.mutate(item.id, {
      onSuccess: () =>
        toast.success(
          t("teacher_common.item_duplicated", "Duplicated as a draft copy"),
        ),
      onError: (err: unknown) =>
        toast.error(
          (err as Error).message ||
            t("teacher_common.duplicate_failed", "Could not duplicate"),
        ),
    });
  }

  const publishing =
    publishLesson.isPending ||
    publishQuiz.isPending ||
    publishInterview.isPending;

  function handlePublish(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const onError = (err: unknown) =>
      toast.error((err as Error).message || t("teacher_common.publish_failed"));
    const onSuccess = () =>
      toast.success(t("teacher_common.item_published", { title }));
    if (item.item_type === "lesson" && item.lesson_id) {
      publishLesson.mutate({ status: "published" }, { onSuccess, onError });
    } else if (item.item_type === "quiz" && item.quiz_id) {
      publishQuiz.mutate(undefined, { onSuccess, onError });
    } else if (item.item_type === "interview" && item.interview_config_id) {
      publishInterview.mutate(undefined, { onSuccess, onError });
    }
  }

  return {
    dragEnabled,
    setDragEnabled,
    duplicateItem,
    publishing,
    handleDuplicateItem,
    handlePublish,
  };
}

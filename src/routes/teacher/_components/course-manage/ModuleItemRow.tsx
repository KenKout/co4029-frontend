import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  GripVertical,
  Pencil,
  Loader2,
  CircleDot,
  Copy,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useUpdateLesson,
  useDuplicateModuleItem,
} from "@/lib/api/hooks/teacher-courses";
import { usePublishQuiz } from "@/lib/api/hooks/quizzes";
import { usePublishInterviewConfig } from "@/lib/api/hooks/interviews";
import type { CourseContentItem } from "@/lib/api/types/common";
import { cn } from "@/lib/utils";
import {
  LESSON_TYPE_CONFIG,
  QUIZ_ITEM_CONFIG,
  INTERVIEW_ITEM_CONFIG,
} from "./constants";

/**
 * A single curriculum item (lesson / quiz / interview) inside a module: icon +
 * type badge, title link to its editor, inline publish for drafts, duplicate,
 * and a drag handle. Dragging is armed only while the grip is held so the
 * title link and action buttons stay clickable.
 */
export function ModuleItemRow({
  item,
  courseId,
  isDragOver,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  item: CourseContentItem;
  courseId: string;
  isDragOver: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const { t } = useTranslation();
  const lesson = item.lesson;
  const quiz = item.quiz;
  const interview = item.interview;
  // Dragging is armed only while the grip handle is held (see the handle
  // button below) so the row's title link + buttons remain clickable.
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
  const lessonType = item.target?.lesson_type ?? lesson?.lesson_type ?? "video";
  const cfg =
    item.item_type === "lesson"
      ? (LESSON_TYPE_CONFIG[lessonType] ?? LESSON_TYPE_CONFIG["video"])
      : item.item_type === "quiz"
        ? QUIZ_ITEM_CONFIG
        : INTERVIEW_ITEM_CONFIG;
  const Icon = cfg?.icon ?? BookOpen;
  const rawLabel = cfg?.label ?? item.item_type;
  const label = rawLabel.startsWith("teacher_common.")
    ? t(rawLabel)
    : item.item_type === "lesson"
      ? t("teacher_common.lesson_fallback")
      : rawLabel;
  const title =
    item.target?.title ??
    lesson?.title ??
    quiz?.title ??
    interview?.title ??
    label;
  // Status lives on `item.target` in the teacher content payload (the
  // `item.lesson/quiz/interview` fields are only populated on the public/learner
  // payload). Reading the wrong field left `status` undefined, so the inline
  // publish control never rendered — the "no quick publish" bug.
  const status =
    item.target?.status ?? lesson?.status ?? quiz?.status ?? interview?.status;
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

  return (
    <div
      draggable={dragEnabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => {
        setDragEnabled(false);
        onDragEnd();
      }}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group select-none",
        isDragging ? "opacity-40" : "",
        isDragOver
          ? "ring-2 ring-m3-primary/40 bg-m3-primary-fixed shadow-sm"
          : "bg-m3-surface hover:bg-m3-surface-container",
      )}
    >
      {/* Drag handle: dragging is enabled ONLY while grabbing this grip, so the
          title link + action buttons stay clickable. Previously the whole row
          was draggable but the title <Link draggable={false}> covered most of
          it and swallowed drag-starts — the "item drag doesn't work" bug. */}
      <button
        type="button"
        aria-label={t("teacher_common.drag_to_reorder")}
        onMouseDown={() => setDragEnabled(true)}
        onMouseUp={() => setDragEnabled(false)}
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -m-0.5 text-m3-outline-variant hover:text-m3-on-surface-variant"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div
        className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
          cfg?.badge ?? "bg-slate-50 text-slate-500",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      {item.item_type === "lesson" && item.lesson_id ? (
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
      )}
      <Badge
        className={cn(
          "text-[10px] border-0 shrink-0",
          cfg?.badge ?? "bg-slate-100 text-slate-500",
        )}
      >
        {label}
      </Badge>
      {status &&
        (status === "published" ? (
          <Badge className="text-[10px] border-0 shrink-0 bg-emerald-100 text-emerald-700">
            {status}
          </Badge>
        ) : (
          // Inline publish (T#2): a draft/archived item can be published right
          // here without opening it. Stops propagation so it doesn't trigger
          // the row's drag / link behaviour.
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            title={t("teacher_common.publish_item")}
            className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 hover:bg-emerald-100 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <CircleDot className="h-2.5 w-2.5" />
            )}
            {t("teacher_common.publish_item")}
          </button>
        ))}
      <div className="flex items-center gap-1 text-m3-on-surface-variant">
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
          onClick={handleDuplicateItem}
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
    </div>
  );
}

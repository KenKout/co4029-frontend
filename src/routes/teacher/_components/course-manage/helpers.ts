import { BookOpen } from "lucide-react";
import { apiPatch, apiPost } from "@/lib/api/client";
import type {
  CourseContentItem,
  CourseContentModule,
} from "@/lib/api/types/common";
import {
  INTERVIEW_ITEM_CONFIG,
  LESSON_TYPE_CONFIG,
  QUIZ_ITEM_CONFIG,
} from "./constants";
import type {
  ItemDisplay,
  ItemTypeConfig,
  ModuleItemStats,
  TranslateFn,
} from "./types";

/**
 * Pure derivations lifted out of `ModuleItemRow` (a 254-line /
 * complexity-56 function whose icon / label / title / status chains accounted
 * for most of that score) and `ModuleAccordion` (its item tallies +
 * `itemStatus`). Every expression is carried over
 * character-for-character; only the surrounding function boundaries are new.
 * (`AddLessonPills`' FE `slugify` lived here too; it was removed when the
 * backend started auto-generating lesson slugs from titles — migration 0087.)
 */

/** Lesson type shown on the row, falling back to `"video"`. */
export function resolveLessonType(item: CourseContentItem): string {
  const lesson = item.lesson;
  return item.target?.lesson_type ?? lesson?.lesson_type ?? "video";
}

/** Icon + badge config for an item; interview items get their own config. */
export function resolveItemConfig(item: CourseContentItem): ItemTypeConfig {
  const lessonType = resolveLessonType(item);
  return item.item_type === "lesson"
    ? (LESSON_TYPE_CONFIG[lessonType] ?? LESSON_TYPE_CONFIG["video"])
    : item.item_type === "quiz"
      ? QUIZ_ITEM_CONFIG
      : INTERVIEW_ITEM_CONFIG;
}

/**
 * Human label for the type badge. Config labels are i18n keys, so anything
 * under the `teacher_common.` namespace is translated; a lesson with an
 * unknown type falls back to the generic lesson label.
 */
export function resolveItemLabel(
  item: CourseContentItem,
  cfg: ItemTypeConfig,
  t: TranslateFn,
): string {
  const rawLabel = cfg?.label ?? item.item_type;
  return rawLabel.startsWith("teacher_common.")
    ? t(rawLabel)
    : item.item_type === "lesson"
      ? t("teacher_common.lesson_fallback")
      : rawLabel;
}

/** Row title, preferring the teacher payload's `target` over the nested rows. */
export function resolveItemTitle(
  item: CourseContentItem,
  label: string,
): string {
  const lesson = item.lesson;
  const quiz = item.quiz;
  const interview = item.interview;
  return (
    item.target?.title ??
    lesson?.title ??
    quiz?.title ??
    interview?.title ??
    label
  );
}

/**
 * Publish status, again preferring `target` over the nested rows. Status lives
 * on `item.target` in the teacher content payload (the
 * `item.lesson/quiz/interview` fields are only populated on the public/learner
 * payload). Reading the wrong field left `status` undefined, so the inline
 * publish control never rendered — the "no quick publish" bug.
 */
export function resolveItemStatus(item: CourseContentItem): string | undefined {
  const lesson = item.lesson;
  const quiz = item.quiz;
  const interview = item.interview;
  return (
    item.target?.status ?? lesson?.status ?? quiz?.status ?? interview?.status
  );
}

/** Everything a curriculum row renders from, in one pass. */
export function resolveItemDisplay(
  item: CourseContentItem,
  t: TranslateFn,
): ItemDisplay {
  const cfg = resolveItemConfig(item);
  const label = resolveItemLabel(item, cfg, t);
  return {
    cfg,
    Icon: cfg?.icon ?? BookOpen,
    label,
    title: resolveItemTitle(item, label),
    status: resolveItemStatus(item),
  };
}

/**
 * Sorted item list and the publish tallies that drive the module header's
 * "N/M published" chip and its "Publish all" action. An item's status lives on
 * its target; items with no status are ignored.
 */
export function computeModuleItemStats(
  module: CourseContentModule,
): ModuleItemStats {
  const allItemsSorted = [...(module.items ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  const statusedItems = (module.items ?? []).filter(
    (i) => resolveItemStatus(i) !== undefined,
  );
  const publishedCount = statusedItems.filter(
    (i) => resolveItemStatus(i) === "published",
  ).length;
  const draftItems = statusedItems.filter(
    (i) => resolveItemStatus(i) !== "published",
  );
  const allPublished =
    statusedItems.length > 0 && publishedCount === statusedItems.length;
  return {
    allItemsSorted,
    statusedItems,
    publishedCount,
    draftItems,
    allPublished,
  };
}

/**
 * The publish request for one draft item. Each item type has its own route, so
 * "Publish all" branches per item. The per-row hooks can't be reused there
 * (hooks can't live in a loop), so this PATCHes / POSTs directly via the same
 * endpoints those hooks call.
 */
export function publishItemRequest(i: CourseContentItem): Promise<unknown> {
  if (i.item_type === "lesson" && i.lesson_id) {
    return apiPatch(`/teacher/lessons/${i.lesson_id}`, {
      status: "published",
    });
  }
  if (i.item_type === "quiz" && i.quiz_id) {
    return apiPost(`/teacher/quizzes/${i.quiz_id}/publish`);
  }
  if (i.item_type === "interview" && i.interview_config_id) {
    return apiPost(
      `/teacher/interview-configs/${i.interview_config_id}/publish`,
    );
  }
  return Promise.reject(new Error("unpublishable item"));
}

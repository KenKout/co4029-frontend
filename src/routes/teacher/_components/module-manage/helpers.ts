import { BookOpen } from "lucide-react";
import type {
  CourseContentItem,
  CourseContentModule,
} from "@/lib/api/types/common";
import { LESSON_TYPE_CONFIG, QUIZ_ITEM_CONFIG } from "./constants";
import type {
  ItemDisplay,
  ItemTypeConfig,
  ModuleStats,
  TranslateFn,
} from "./types";

/**
 * Pure derivations lifted out of the former 887-line `module-manage.tsx`. The
 * curriculum row used to resolve its icon / label / title / status inline,
 * which alone accounted for most of its complexity-51 score. Each expression
 * below is carried over character-for-character; only the surrounding function
 * boundaries are new.
 */

/** Lesson type shown on the row, falling back to `"video"`. */
export function resolveLessonType(item: CourseContentItem): string {
  const lesson = item.lesson;
  return item.target?.lesson_type ?? lesson?.lesson_type ?? "video";
}

/** Icon + badge config for an item, or `null` for interview items. */
export function resolveItemConfig(
  item: CourseContentItem,
): ItemTypeConfig | null {
  const lessonType = resolveLessonType(item);
  return item.item_type === "quiz"
    ? QUIZ_ITEM_CONFIG
    : item.item_type === "lesson"
      ? (LESSON_TYPE_CONFIG[lessonType] ?? LESSON_TYPE_CONFIG["video"])
      : null;
}

/** Human label for the type badge. */
export function resolveItemLabel(
  item: CourseContentItem,
  cfg: ItemTypeConfig | null,
  t: TranslateFn,
): string {
  return item.item_type === "quiz"
    ? t(QUIZ_ITEM_CONFIG.label)
    : item.item_type === "interview"
      ? t("teacher_common.interview_label")
      : (cfg?.label ?? item.item_type);
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

/** Publish status, again preferring `target` over the nested rows. */
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

/** Total / published / draft counts for the settings sidebar stats grid. */
export function computeModuleStats(module: CourseContentModule): ModuleStats {
  const items = module.items ?? [];
  const publishedCount = items.filter((i) => {
    if (i.item_type === "lesson") return i.lesson?.status === "published";
    if (i.item_type === "quiz") return i.quiz?.status === "published";
    if (i.item_type === "interview") return i.interview?.status === "published";
    return false;
  }).length;
  const draftCount = items.length - publishedCount;
  return { total: items.length, publishedCount, draftCount };
}

/** Slug seed for a freshly added lesson. */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

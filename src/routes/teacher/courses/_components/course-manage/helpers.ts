import type {
  CourseContentItem,
  CourseContentModule,
} from "@/lib/api/types/common";

/**
 * Publish-progress helpers of the course-management page, moved verbatim out of
 * the former 255-line course-manage.tsx where they were inline inside the
 * quick-nav `map`.
 */

/** First status any of the four item kinds carries, or undefined. */
export function moduleItemStatus(i: CourseContentItem) {
  return (
    i.target?.status ??
    i.lesson?.status ??
    i.quiz?.status ??
    i.interview?.status
  );
}

/** Published-vs-total for the module's status-bearing items. */
export function modulePublishProgress(module: CourseContentModule) {
  const items = (module.items ?? []).filter(
    (i) => moduleItemStatus(i) !== undefined,
  );
  const pub = items.filter((i) => moduleItemStatus(i) === "published").length;
  const done = items.length > 0 && pub === items.length;
  return { items, pub, done };
}

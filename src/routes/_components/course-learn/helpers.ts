import type {
  LessonPublic,
  ModuleItemPublic,
  ModulePublic,
} from "@/lib/api/types";
import type { FlatItem, LessonState } from "./types";
import type { LearnUrlState } from "./use-learn-url-state";

/**
 * Pure curriculum helpers for the student course-learn screen.
 */

export function buildFlatItems(
  modules: ModulePublic[],
  itemsByModule: Record<string, ModuleItemPublic[] | undefined>,
  lessonFallback: string,
  quizLabel: string,
  interviewLabel: string,
): FlatItem[] {
  const sortedModules = [...modules].sort((a, b) => a.position - b.position);
  return sortedModules.flatMap((mod) => {
    const items = itemsByModule[mod.id] ?? [];
    return [...items]
      .sort((a, b) => a.position - b.position)
      .map<FlatItem>((item) => ({
        moduleId: mod.id,
        moduleTitle: mod.title,
        item,
        // Prefer the concrete title (e.g. "Ngan's Interview", "Chapter 1 Quiz")
        // carried on item.target for every item type; fall back to the generic
        // type label only when the target has no title (e.g. a draft the reader
        // slimmed out).
        label:
          item.target?.title ??
          (item.item_type === "quiz"
            ? quizLabel
            : item.item_type === "interview"
              ? interviewLabel
              : lessonFallback),
      }));
  });
}

/**
 * Curriculum row state for a flattened item. Extracted from the page shell so
 * the shell only has to close over the two values the decision depends on.
 */
export function itemStateFor(
  fi: FlatItem,
  activeLessonId: string | undefined,
  lessonStatusMap: Map<string, string>,
): LessonState {
  if (fi.item.item_type === "lesson" && fi.item.target?.id === activeLessonId) {
    return "active";
  }
  if (fi.item.item_type === "lesson" && fi.item.target?.id) {
    const id = fi.item.target.id;
    // if (lockedLessonIds.has(id)) return "locked"; // DEV: comment out to disable lock
    if (lessonStatusMap.get(id) === "completed") return "completed";
  }
  return "pending";
}

/**
 * Course-home landing predicate: `?item` absent AND no content deep-link.
 * The page shell's call site documents why this is URL-derived, not state.
 */
export function deriveShowHome({
  search,
  seekSeconds,
  targetPage,
  targetAnchor,
}: Pick<
  LearnUrlState,
  "search" | "seekSeconds" | "targetPage" | "targetAnchor"
>): boolean {
  return (
    !search.item && seekSeconds === null && targetPage === null && !targetAnchor
  );
}

export function activeTitleFor(
  activeLesson: LessonPublic | null,
  activeEntry: FlatItem | null,
): string | undefined {
  return activeLesson?.title ?? activeEntry?.label;
}

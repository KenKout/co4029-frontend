import type {
  InterviewProgressRead,
  LessonPublic,
  ModuleItemPublic,
  ModulePublic,
  QuizProgressRead,
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
 * Whether a single item counts as completed, by item type.
 *
 * Split out of ``itemStateFor`` because adding the interview branch inline
 * pushed that function past the eslint complexity ceiling (15). Returns
 * ``false`` whenever the relevant map has not loaded, so a caller mid-fetch
 * degrades to "not completed" rather than throwing.
 */
function itemIsCompleted(
  fi: FlatItem,
  lessonStatusMap: Map<string, string>,
  quizProgressMap?: Map<string, QuizProgressRead>,
  interviewProgressMap?: Map<string, InterviewProgressRead>,
): boolean {
  const targetId = fi.item.target?.id;
  if (!targetId) return false;
  switch (fi.item.item_type) {
    case "lesson":
      // if (lockedLessonIds.has(targetId)) return "locked"; // DEV: comment out to disable lock
      return lessonStatusMap.get(targetId) === "completed";
    case "quiz":
      return quizProgressMap?.get(targetId)?.completed === true;
    case "interview":
      return interviewProgressMap?.get(targetId)?.completed === true;
    default:
      return false;
  }
}

/**
 * Curriculum row state for a flattened item. Extracted from the page shell so
 * the shell only has to close over the two values the decision depends on.
 *
 * Completion WINS over the "currently open" affordance: a completed lesson
 * must read as done (green check), not as the in-progress blue bar — the
 * user's eye should land on what's left, and a done row that stays
 * highlighted reads as "still to do" (bug report 2026-08-04: completed
 * Introduction stayed blue for 30+ min). Quiz items are "completed" when
 * the per-quiz progress map says so — passed the teacher's milestone OR
 * failed with every allowed attempt consumed (``QuizProgressRead.completed``).
 *
 * Interview items are "completed" when the per-interview progress map says so,
 * which — unlike quizzes — means PASSED and nothing else (user decision
 * 2026-08-06; see ``InterviewProgressRead``). A student who has attempted an
 * interview and not passed it stays ``pending``, because the tag is meant to
 * read as "đạt". Both progress maps are optional so a caller that has not
 * loaded them yet degrades to the previous behaviour rather than throwing.
 */
export function itemStateFor(
  fi: FlatItem,
  activeLessonId: string | undefined,
  lessonStatusMap: Map<string, string>,
  quizProgressMap?: Map<string, QuizProgressRead>,
  interviewProgressMap?: Map<string, InterviewProgressRead>,
): LessonState {
  if (
    itemIsCompleted(fi, lessonStatusMap, quizProgressMap, interviewProgressMap)
  ) {
    return "completed";
  }
  if (fi.item.item_type === "lesson" && fi.item.target?.id === activeLessonId) {
    return "active";
  }
  return "pending";
}

/**
 * Is every item in ``mod`` completed?
 *
 * Completion is decided by ``itemState``: lessons via their progress status,
 * quizzes via the milestone rule (passed OR failed-with-all-attempts-used —
 * see ``QuizProgressRead.completed``), interviews via a PASS
 * (``InterviewProgressRead.completed``, threaded through ``itemStateFor``).
 *
 * A module containing an interview can therefore now auto-collapse once that
 * interview is passed — previously it never could, because interviews carried
 * no completion signal at all.
 */
export function moduleIsComplete(
  mod: ModulePublic,
  flatItems: FlatItem[],
  itemState: (fi: FlatItem) => LessonState,
): boolean {
  const items = flatItems.filter((fi) => fi.moduleId === mod.id);
  if (!items.length) return false;
  return items.every((fi) => itemState(fi) === "completed");
}

/**
 * Id of the earliest (in course order) item the student still has to do, or
 * ``undefined`` when everything is done. "Pending" only — the currently open
 * lesson (state ``active``) and completed items are excluded, so the
 * highlight always points at the genuine next step.
 *
 * Interview items are still SKIPPED, even though they now have a completion
 * signal. Under the interview rule a never-passed interview is PERMANENTLY
 * pending (failing does not complete it, unlike a quiz running out of
 * attempts), so letting interviews claim this highlight would reproduce the
 * original bug: a blue "do this next" glow parked on an interview the student
 * has already attempted, indefinitely, and contradicting the course-home
 * "Next up" label which resolves against lessons only (``resumeIdx``).
 *
 * Passing an interview still matters here — it feeds ``moduleIsComplete`` and
 * the row's own completed styling; it just does not participate in choosing
 * the next step.
 */
export function earliestPendingItemId(
  flatItems: FlatItem[],
  itemState: (fi: FlatItem) => LessonState,
): string | undefined {
  const fi = flatItems.find(
    (item) =>
      item.item.item_type !== "interview" && itemState(item) === "pending",
  );
  return fi?.item.id;
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

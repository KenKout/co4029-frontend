import { useMemo } from "react";
import { ApiError } from "@/lib/api/client";
import { useLesson, useLessonResources } from "@/lib/api/hooks/courses";
import { useMyCourseProgress } from "@/lib/api/hooks/progress";
import type { LessonPublic, LessonResourcePublic } from "@/lib/api/types";
import type { FlatItem, Tab } from "./types";

/**
 * Content for the lesson the student currently has open, plus the course-wide
 * lesson completion map. Both are read-only derivations of query state.
 */

export interface LessonLockRequirements {
  currentRatio: number;
  requiredRatio: number;
  totalCards: number;
  passingCards: number;
  prerequisitesMet: boolean;
  interviewPassRequired: boolean;
  interviewPassed: boolean;
  nextUnlockEstimate: string | null;
  /**
   * Quizzes holding the cards that are keeping the lesson shut, worst first.
   *
   * The gate is cleared by answering quiz questions, and quiz routes are not
   * lesson-gated, so the student is never actually stuck — but until this
   * arrived the locked screen said "review 4 more cards" with nothing to click,
   * which reads as a dead end. Ids only: the curriculum already on screen
   * carries each quiz's title and slug.
   */
  blockingQuizIds: string[];
}

/**
 * How many more cards must reach the EF threshold before the lesson opens.
 *
 * Computed here rather than read from `nextUnlockEstimate`, which the backend
 * builds as a hardcoded English sentence and would show untranslated to a
 * Vietnamese reader.
 */
export function cardsNeededToUnlock(lock: LessonLockRequirements): number {
  if (lock.totalCards <= 0) return 0;
  const required = Math.ceil(lock.requiredRatio * lock.totalCards);
  return Math.max(required - lock.passingCards, 0);
}

/** Ids the server sent, keeping only usable strings. */
function parseBlockingQuizIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
}

export function parseLessonLockRequirements(
  error: unknown,
): LessonLockRequirements | null {
  if (!(error instanceof ApiError) || error.status !== 403) return null;
  const detail = error.parsedBody;
  if (!detail || typeof detail !== "object" || !("detail" in detail)) return null;
  const payload = detail.detail;
  if (!payload || typeof payload !== "object" || !("error" in payload)) return null;
  const lock = payload as Record<string, unknown>;
  if (lock.error !== "lesson_locked") return null;
  return {
    currentRatio: Number(lock.current_ratio ?? 0),
    requiredRatio: Number(lock.required_ratio ?? 0),
    totalCards: Number(lock.total_cards ?? 0),
    passingCards: Number(lock.passing_cards ?? 0),
    prerequisitesMet: lock.prerequisites_met === true,
    interviewPassRequired: lock.interview_pass_required === true,
    interviewPassed: lock.interview_passed === true,
    nextUnlockEstimate:
      typeof lock.next_unlock_estimate === "string"
        ? lock.next_unlock_estimate
        : null,
    blockingQuizIds: parseBlockingQuizIds(lock.blocking_quiz_ids),
  };
}

export interface ActiveLessonContent {
  activeLessonId: string | undefined;
  activeLesson: LessonPublic | null;
  lessonUnavailable: boolean;
  lessonLock: LessonLockRequirements | null;
  resources: LessonResourcePublic[] | undefined;
}

export function useActiveLessonContent(
  activeEntry: FlatItem | null,
  activeTab: Tab,
): ActiveLessonContent {
  // A lesson_locked 403 is authoritative: do not substitute the slim sidebar
  // target, because that would render protected lesson content as if it opened.
  const activeLessonId = activeEntry?.item.target?.id;
  const lessonQuery = useLesson(activeLessonId);
  const lessonLock = parseLessonLockRequirements(lessonQuery.error);
  const activeLesson = lessonLock
    ? null
    : lessonQuery.data ??
      (activeEntry?.item.target?.id && activeEntry?.item.target
        ? (activeEntry.item.target as LessonPublic)
        : null);
  const lessonUnavailable =
    lessonQuery.isError &&
    lessonQuery.error instanceof ApiError &&
    lessonQuery.error.status === 404;

  const lessonIdForResources =
    activeTab === "Resources" && !lessonLock
      ? (activeLessonId ?? undefined)
      : undefined;
  const { data: resources } = useLessonResources(lessonIdForResources);

  return { activeLessonId, activeLesson, lessonUnavailable, lessonLock, resources };
}

export function useLessonStatusMap(courseId: string): Map<string, string> {
  const courseProgressQuery = useMyCourseProgress(courseId);
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const row of courseProgressQuery.data?.lessons ?? []) {
      map.set(row.lesson_id, row.status);
    }
    return map;
  }, [courseProgressQuery.data]);
}

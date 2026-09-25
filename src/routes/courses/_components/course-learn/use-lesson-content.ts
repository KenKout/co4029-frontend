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

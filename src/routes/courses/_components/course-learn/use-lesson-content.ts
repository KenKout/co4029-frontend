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

export interface ActiveLessonContent {
  activeLessonId: string | undefined;
  activeLesson: LessonPublic | null;
  lessonUnavailable: boolean;
  resources: LessonResourcePublic[] | undefined;
}

export function useActiveLessonContent(
  activeEntry: FlatItem | null,
  activeTab: Tab,
): ActiveLessonContent {
  // Fallback: use sidebar metadata when API returns lesson_locked 403
  const activeLessonId = activeEntry?.item.target?.id;
  const lessonQuery = useLesson(activeLessonId);
  const activeLesson =
    lessonQuery.data ??
    (activeEntry?.item.target?.id && activeEntry?.item.target
      ? (activeEntry.item.target as LessonPublic)
      : null);
  const lessonUnavailable =
    lessonQuery.isError &&
    lessonQuery.error instanceof ApiError &&
    lessonQuery.error.status === 404;

  const lessonIdForResources =
    activeTab === "Resources" ? (activeLessonId ?? undefined) : undefined;
  const { data: resources } = useLessonResources(lessonIdForResources);

  return { activeLessonId, activeLesson, lessonUnavailable, resources };
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

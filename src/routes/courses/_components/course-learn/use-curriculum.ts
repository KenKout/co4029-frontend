import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useMyInterviewSessions } from "@/lib/api/hooks/interviews";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  InterviewProgressRead,
  InterviewSessionPublic,
  ModuleItemPublic,
  ModulePublic,
  QuizProgressRead,
} from "@/lib/api/types";
import { buildFlatItems } from "./helpers";
import type { FlatItem, Translate } from "./types";

/**
 * Curriculum data for the student course-learn screen: the per-module item
 * queries, the flattened item list the sidebar/home share, and the student's
 * in-progress interview sessions.
 *
 * The hooks are kept in this call order (items map -> flattened list ->
 * interview sessions) because the page shell calls them in that order and the
 * flattened list derives from the items map.
 */

export function useModuleItemsMap(
  modules: ModulePublic[],
): Record<string, ModuleItemPublic[] | undefined> {
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);

  const results = useQueries({
    queries: moduleIds.map((moduleId) => ({
      queryKey: queryKeys.courses.moduleItems(moduleId),
      queryFn: () => apiFetch<ModuleItemPublic[]>(`/modules/${moduleId}/items`),
      enabled: !!moduleId,
    })),
  });

  return useMemo(() => {
    const next: Record<string, ModuleItemPublic[] | undefined> = {};
    moduleIds.forEach((id, idx) => {
      next[id] = results[idx]?.data;
    });
    return next;
  }, [moduleIds, results]);
}

/**
 * Per-quiz completion state for the calling student in the course, keyed by
 * quiz id. Completion follows the teacher-configured milestone: passed (per
 * the grade-of-record) OR failed with every allowed attempt consumed and
 * nothing in flight → completed. Used by the curriculum to let quiz items
 * participate in auto-collapse + next-item highlighting.
 */
export function useMyQuizProgress(
  courseId: string,
): Map<string, QuizProgressRead> {
  const { data } = useQuery({
    queryKey: queryKeys.quizzes.progress(courseId),
    queryFn: () =>
      apiFetch<QuizProgressRead[]>(`/courses/${courseId}/quiz-progress`),
    enabled: !!courseId,
  });
  return useMemo(() => {
    const map = new Map<string, QuizProgressRead>();
    for (const row of data ?? []) map.set(row.quiz_id, row);
    return map;
  }, [data]);
}

/**
 * Per-interview completion state for the calling student, keyed by interview
 * CONFIG id (which is what `ModuleItemPublic.target.id` carries on interview
 * items, so the map is directly consumable by `itemStateFor`).
 *
 * Completion rule differs from quizzes deliberately (user decision
 * 2026-08-06): an interview is completed only when at least one non-practice
 * attempt PASSED. Failing every attempt keeps it pending — the tag means
 * "passed", not "finished". Practice runs never count.
 *
 * Must be called AFTER `useMyQuizProgress` — this file's hook call order is
 * load-bearing (see the module docstring).
 */
export function useMyInterviewProgress(
  courseId: string,
): Map<string, InterviewProgressRead> {
  const { data } = useQuery({
    queryKey: queryKeys.interviews.progress(courseId),
    queryFn: () =>
      apiFetch<InterviewProgressRead[]>(
        `/courses/${courseId}/interview-progress`,
      ),
    enabled: !!courseId,
  });
  return useMemo(() => {
    const map = new Map<string, InterviewProgressRead>();
    for (const row of data ?? []) map.set(row.interview_config_id, row);
    return map;
  }, [data]);
}

/**
 * The flattened curriculum (`flatItems`) plus the lesson-only subset the
 * player navigates through (`lessonItems`). `t` is passed in rather than read
 * from context here so the memo dependency stays exactly `[..., t]`.
 */
export function useCurriculumItems(
  sortedModules: ModulePublic[],
  itemsByModule: Record<string, ModuleItemPublic[] | undefined>,
  t: Translate,
): { flatItems: FlatItem[]; lessonItems: FlatItem[] } {
  const flatItems = useMemo(
    () =>
      buildFlatItems(
        sortedModules,
        itemsByModule,
        t("teacher_common.lesson_fallback"),
        t("teacher_common.quiz_label"),
        t("teacher_common.interview_label"),
      ),
    [sortedModules, itemsByModule, t],
  );

  const lessonItems = useMemo(
    () =>
      flatItems.filter(
        (fi) => fi.item.item_type === "lesson" && fi.item.target,
      ),
    [flatItems],
  );

  return { flatItems, lessonItems };
}

/**
 * Map interview_config_id -> the student's in-progress session for it, so the
 * curriculum can disable that interview item and offer a "continue" action
 * instead of letting the student start a second concurrent session.
 */
export function useInProgressInterviewSessions(
  courseId: string,
): Map<string, InterviewSessionPublic> {
  const { data: myInterviewSessions } = useMyInterviewSessions();
  return useMemo(() => {
    const map = new Map<string, InterviewSessionPublic>();
    for (const session of myInterviewSessions ?? []) {
      if (session.status !== "in_progress") continue;
      if (session.course_id && session.course_id !== courseId) continue;
      // Keep the most recently started session per config.
      const existing = map.get(session.interview_config_id);
      if (
        !existing ||
        new Date(session.started_at).getTime() >
          new Date(existing.started_at).getTime()
      ) {
        map.set(session.interview_config_id, session);
      }
    }
    return map;
  }, [myInterviewSessions, courseId]);
}

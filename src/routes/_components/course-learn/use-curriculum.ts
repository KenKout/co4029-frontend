import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useMyInterviewSessions } from "@/lib/api/hooks/interviews";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  InterviewSessionPublic,
  ModuleItemPublic,
  ModulePublic,
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

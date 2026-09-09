import { useMemo } from "react";
import { useManagedLearningPrograms } from "@/lib/api/hooks/learning-programs";
import {
  useCareerPathStages,
  useTeacherCareerPathProgress,
} from "@/lib/api/hooks/career-paths";

/**
 * Per-tab counts for the detail screen's tab strip. Reuses the exact queries
 * the tabs themselves render (same query keys), so a count is served from
 * cache the moment its tab has been opened, and the tab opens to data that is
 * already warm — nothing new is fetched for the counts alone.
 *
 * A count is undefined while its query is loading; TabBar renders no badge
 * until a number exists.
 */
export function usePathTabCounts(id: string) {
  const stages = useCareerPathStages(id);
  const progress = useTeacherCareerPathProgress(id);
  const programs = useManagedLearningPrograms();

  const courses = useMemo(
    () =>
      stages.data
        ? stages.data.reduce((sum, stage) => sum + (stage.course_count ?? 0), 0)
        : undefined,
    [stages.data],
  );
  const students = progress.data ? progress.data.length : undefined;
  const programCount = useMemo(() => {
    if (!programs.data) return undefined;
    return programs.data.filter((program) =>
      program.paths.some((path) => path.career_path_id === id),
    ).length;
  }, [programs.data, id]);

  return { courses, students, programs: programCount };
}

/**
 * The six config-level mutations the interview-config page drives, bundled into
 * one hook so the page reads as data → state → composition.
 *
 * Split out of `routes/teacher/interview-config.tsx` (step 7 of that file's
 * decomposition). The hooks are called in the SAME order as before, so React's
 * hook slots are unchanged — this is a grouping, not a re-ordering.
 */

import {
  useArchiveInterviewConfig,
  useDeleteInterviewConfig,
  usePublishInterviewConfig,
  useUnarchiveInterviewConfig,
  useUnpublishInterviewConfig,
  useUpdateInterviewConfig,
} from "@/lib/api/hooks/interviews";

export function useConfigMutations(configId: string, courseId: string) {
  const updateConfig = useUpdateInterviewConfig(configId);
  const publishConfig = usePublishInterviewConfig(configId);
  const archiveConfig = useArchiveInterviewConfig(configId);
  const unarchiveConfig = useUnarchiveInterviewConfig(configId);
  const unpublishConfig = useUnpublishInterviewConfig(configId);
  const deleteConfig = useDeleteInterviewConfig(configId, courseId);
  return {
    updateConfig,
    publishConfig,
    archiveConfig,
    unarchiveConfig,
    unpublishConfig,
    deleteConfig,
  };
}

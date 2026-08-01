import { useTeacherMaterialStatus } from "@/lib/api/hooks/materials";
import type { LearningMaterial } from "@/lib/api/types/teacher";

import { PROC_STATUS } from "./constants";
import { processingProgress } from "./processing-progress";
import { ProcessingStatusBar } from "./ProcessingStatusBar";
import { ProcessingStatusHeader } from "./ProcessingStatusHeader";

/**
 * Live ingest progress for the material currently being processed. This is the
 * orchestrator: the status poll plus composition. The percent/stage derivation
 * lives in {@link processingProgress} and the two regions are their own
 * components.
 */
export function ProcessingStatusCard({
  material,
}: {
  material: LearningMaterial;
}) {
  const { data: status } = useTeacherMaterialStatus(material.id);
  const proc =
    PROC_STATUS[status?.processing_status ?? "pending"] ?? PROC_STATUS.pending;
  const procKey = status?.processing_status ?? "pending";
  const progress = processingProgress(status);

  return (
    <div className="p-6 bg-m3-surface-container-low rounded-xl border border-m3-secondary/10 space-y-4">
      <ProcessingStatusHeader
        material={material}
        proc={proc}
        procKey={procKey}
        percent={progress.percent}
        inFlight={progress.inFlight}
      />

      <ProcessingStatusBar progress={progress} />
    </div>
  );
}

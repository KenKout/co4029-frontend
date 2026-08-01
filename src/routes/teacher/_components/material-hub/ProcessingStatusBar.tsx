import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import {
  PROCESSING_STAGE_FALLBACK_KEY,
  PROCESSING_STAGE_LABEL_KEY,
} from "./constants";
import type { ProcessingProgress } from "./processing-progress";

/**
 * Pulsing progress bar plus the stage caption of the processing card. The
 * caption used to be a five-deep ternary chain; the stage → key lookup lives in
 * {@link PROCESSING_STAGE_LABEL_KEY} and resolves to the same strings.
 */
export function ProcessingStatusBar({
  progress,
}: {
  progress: ProcessingProgress;
}) {
  const { t } = useTranslation();
  const { rawStatus, percent, inFlight, kgDetail } = progress;
  return (
    <div className="space-y-1.5">
      <div className="h-1.5 rounded-full bg-m3-outline-variant/30 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full bg-m3-secondary transition-all duration-500 ease-out",
            inFlight && "ai-pulse",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[11px] text-m3-on-surface-variant">
        {rawStatus === "building_kg"
          ? `${t("teacher_lesson_materials.processing.building_kg")}${kgDetail ? ` (${kgDetail})` : ""}`
          : t(
              PROCESSING_STAGE_LABEL_KEY[rawStatus] ??
                PROCESSING_STAGE_FALLBACK_KEY,
            )}
      </p>
    </div>
  );
}

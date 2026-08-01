import type { MaterialStatus } from "@/lib/api/types/teacher";

import { PROCESSING_IN_FLIGHT, STAGE_FLOOR } from "./constants";

/**
 * The processing-progress projection of {@link ProcessingStatusCard}, extracted
 * verbatim from the former 1422-line material-hub.tsx so the card itself stays
 * a thin shell and the derivation can be read on its own.
 */
export interface ProcessingProgress {
  rawStatus: string;
  /** Live worker percent, floored per stage so a running stage never reads 0. */
  percent: number;
  inFlight: boolean;
  /**
   * Live sub-progress the worker publishes for looping stages, surfaced by the
   * endpoint on latest_log_line as "kg_build · 42/85". Pulled out as the "N/M"
   * count so the KG line can show a running tally instead of a frozen 95%.
   */
  kgDetail: string;
}

export function processingProgress(
  status: MaterialStatus | undefined,
): ProcessingProgress {
  const rawStatus = status?.processing_status ?? "pending";
  const livePercent = status?.progress_percent ?? 0;
  const floor = STAGE_FLOOR[rawStatus] ?? 0;
  const percent = Math.max(livePercent, floor);
  const inFlight = PROCESSING_IN_FLIGHT.includes(rawStatus);
  const kgDetail = /(\d+\/\d+)/.exec(status?.latest_log_line ?? "")?.[1] ?? "";
  return { rawStatus, percent, inFlight, kgDetail };
}

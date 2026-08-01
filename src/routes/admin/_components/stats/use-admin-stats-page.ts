import { useTranslation } from "react-i18next";

import { useAdminDashboard } from "@/lib/api/hooks/admin";
import { useReadyz } from "@/lib/api/hooks/infra";

import {
  buildAttentionCandidates,
  deriveFailedCallsSeverity,
  deriveFailureSeverity,
  deriveFailureTrendPct,
  derivePassRate,
  deriveQueueSeverity,
  deriveSpend,
  deriveHealth,
  jobFailureRate,
} from "./helpers";
import type { AdminStatsController, ReadyzSummary } from "./types";
import { useFormatters } from "./use-formatters";

/**
 * Resolves every derived value the overview dashboard renders.
 *
 * Hook call order is identical to the original page component
 * (`useTranslation` → `useAppLocale` via `useFormatters` → dashboard query →
 * readyz query); only the pure derivations moved out into `helpers.ts`.
 */
export function useAdminStatsPage(): AdminStatsController {
  const { t } = useTranslation();
  const f = useFormatters();
  const { data, isLoading, isError } = useAdminDashboard();
  const readyz = useReadyz();

  const ready = readyz.data as ReadyzSummary | undefined;
  const failureRate = jobFailureRate(data);
  const attentionCandidates = buildAttentionCandidates(t, data);
  const attentionItems = attentionCandidates.filter((i) => i.count > 0);

  return {
    t,
    f,
    data,
    isLoading,
    isError,
    health: deriveHealth(ready, readyz.isError),
    failureRate,
    failureSeverity: deriveFailureSeverity(failureRate),
    failureTrendPct: deriveFailureTrendPct(data, failureRate),
    queueSeverity: deriveQueueSeverity(data),
    failedCallsSeverity: deriveFailedCallsSeverity(data),
    spend: deriveSpend(data),
    passRate: derivePassRate(data),
    attentionItems,
    clearCount: attentionCandidates.length - attentionItems.length,
  };
}

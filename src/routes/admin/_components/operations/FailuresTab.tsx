import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { ProcessingJobsSection } from "../processing/ProcessingJobsSection";
import type { AdminProcessingController } from "../processing/use-admin-processing";

/**
 * Failures tab — everything that ended badly, in one place.
 *
 * Today that means failed jobs, pinned to `status=failed` by the tab itself so
 * the operator never has to re-apply the filter. Failed AI calls are the other
 * half of the picture but they live behind the AI-cost dashboard's own
 * filters, so this links there rather than duplicating that surface with a
 * second, subtly different definition of "failed call" — the exact habit
 * ADM-004 exists to stop.
 */
export function FailuresTab({ c }: { c: AdminProcessingController }) {
  const { t } = c;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        {t("admin.operations.failures.subtitle")}
      </p>

      <ProcessingJobsSection c={c} />

      <Link
        to="/admin/ai-costs"
        search={{ status: "failed" } as never}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-m3-primary hover:underline"
      >
        {t("admin.operations.failures.ai_calls_link")}
        <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

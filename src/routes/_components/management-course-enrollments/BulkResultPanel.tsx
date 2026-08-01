import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { BulkEnrollResult } from "@/lib/api/types";
import { BulkFailureGroups } from "./BulkFailureGroups";
import { groupFailuresByReason } from "./helpers";
import { useFailureLabel } from "./use-failure-label";

/**
 * Summary of the last bulk import: how many landed, how many failed, and the
 * per-reason failure breakdown. Owns the expand/collapse state and the failure
 * label resolver so the groups list stays presentational.
 */
export function BulkResultPanel({
  result,
  onClose,
}: {
  result: BulkEnrollResult;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const failureLabel = useFailureLabel();
  const [showFailures, setShowFailures] = useState(true);
  const grouped = useMemo(
    () => groupFailuresByReason(result.failures),
    [result.failures],
  );

  return (
    <div className="bg-m3-surface-container-lowest rounded-xl border border-m3-outline-variant/20 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-m3-on-surface">
          {t("management_course_enrollments.bulk_result.title")}
        </h3>
        <Button size="xs" variant="ghost" onClick={onClose}>
          {t("common.close")}
        </Button>
      </div>
      <div className="flex gap-4 text-sm">
        <span className="text-emerald-700 font-semibold">
          {t("management_course_enrollments.bulk_result.added", {
            count: result.enrolled.length,
          })}
        </span>
        {result.failures.length > 0 && (
          <span className="text-amber-700 font-semibold">
            {t("management_course_enrollments.bulk_result.errors", {
              count: result.failures.length,
            })}
          </span>
        )}
      </div>

      {grouped.length > 0 && (
        <BulkFailureGroups
          count={result.failures.length}
          grouped={grouped}
          expanded={showFailures}
          onToggle={() => setShowFailures((v) => !v)}
          failureLabel={failureLabel}
        />
      )}
    </div>
  );
}

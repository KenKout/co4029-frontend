import { useTranslation } from "react-i18next";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { BulkEnrollFailure } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

/**
 * The collapsible breakdown of why individual identifiers were rejected, one
 * section per reason. Kept separate from the result summary so neither piece of
 * markup has to be read through the other.
 */
export function BulkFailureGroups({
  count,
  grouped,
  expanded,
  onToggle,
  failureLabel,
}: {
  count: number;
  grouped: [string, BulkEnrollFailure[]][];
  expanded: boolean;
  onToggle: () => void;
  failureLabel: (reason: string) => string;
}) {
  const { t } = useTranslation();

  return (
    <div className="border border-m3-outline-variant/20 rounded-lg overflow-hidden">
      <Button variant="ghost"
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 bg-m3-surface-container text-sm font-medium hover:bg-m3-surface-container-high transition-colors h-auto whitespace-normal"
      >
        <span className="flex items-center gap-2 text-m3-on-surface">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          {t("management_course_enrollments.bulk_result.error_details", {
            count,
          })}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-m3-on-surface-variant" />
        ) : (
          <ChevronDown className="h-4 w-4 text-m3-on-surface-variant" />
        )}
      </Button>
      {expanded && (
        <div className="divide-y divide-m3-outline-variant/10">
          {grouped.map(([reason, items]) => (
            <div key={reason} className="px-4 py-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-m3-on-surface-variant">
                {failureLabel(reason)} ({items.length})
              </p>
              <ul className="space-y-1 text-xs font-mono text-m3-on-surface">
                {items.map((f, i) => (
                  <li key={`${reason}-${i}`} className="truncate">
                    {f.identifier}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

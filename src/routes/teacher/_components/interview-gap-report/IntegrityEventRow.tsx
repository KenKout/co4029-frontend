import { useTranslation } from "react-i18next";

import type { InterviewIntegrityEvent } from "@/lib/api/hooks/interviews";
import { cn } from "@/lib/utils";
import { INTEGRITY_EVENT_META, INTEGRITY_SEVERITY_META } from "./constants";
import { formatDate } from "./helpers";

/** One row of the chronological proctoring-signal timeline. */
export function IntegrityEventRow({
  event: ev,
  isLast,
}: {
  event: InterviewIntegrityEvent;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const eventMeta =
    INTEGRITY_EVENT_META[ev.event_type] ?? INTEGRITY_EVENT_META.focus_lost;
  const severityMeta =
    INTEGRITY_SEVERITY_META[ev.severity] ?? INTEGRITY_SEVERITY_META.info;
  const Icon = eventMeta.icon;
  return (
    <li className="group flex gap-3">
      {/* Timeline rail: dot + connecting line. */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            "transition-transform duration-200 group-hover:scale-110",
            eventMeta.iconBg,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {!isLast && <span className="w-px flex-1 bg-border" />}
      </div>
      <div
        className={cn(
          "-mx-2 mb-1 flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-2 pb-3 pt-0.5",
          "transition-colors duration-200 group-hover:bg-m3-surface-container-low",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-sm text-m3-on-surface">
          {t(`teacher_interview_gap_report.integrity.event.${ev.event_type}`, {
            defaultValue: ev.event_type,
          })}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            severityMeta.badge,
          )}
        >
          {t(`teacher_interview_gap_report.integrity.severity.${ev.severity}`, {
            defaultValue: ev.severity,
          })}
        </span>
        <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-m3-on-surface-variant">
          {formatDate(ev.created_at)}
        </span>
      </div>
    </li>
  );
}

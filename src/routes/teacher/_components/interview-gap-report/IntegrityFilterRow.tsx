import { Eye, ListFilter, Maximize, MonitorX } from "lucide-react";
import { useTranslation } from "react-i18next";

import { IntegrityFilterTab } from "./IntegrityFilterTab";
import type { IntegrityCounts, IntegrityFilter } from "./types";

/**
 * Per-type breakdown, doubling as the filter for the timeline below.
 * Four buckets: everything, then one per event type. Clicking one shows
 * only that type, so a teacher can read the 7 tab switches without
 * scrolling past 14 interleaved focus-loss rows.
 */
export function IntegrityFilterRow({
  counts,
  filter,
  onSelect,
}: {
  counts: IntegrityCounts;
  filter: IntegrityFilter;
  onSelect: (next: IntegrityFilter) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4"
      role="group"
      aria-label={t(
        "teacher_interview_gap_report.integrity.filter_group_label",
      )}
    >
      <IntegrityFilterTab
        icon={ListFilter}
        count={counts.total}
        selected={filter === "total"}
        warning={false}
        onSelect={() => onSelect("total")}
        label={t("teacher_interview_gap_report.integrity.filter.total")}
      />
      <IntegrityFilterTab
        icon={MonitorX}
        count={counts.tabSwitch}
        selected={filter === "tab_switch"}
        warning={counts.tabSwitch > 0}
        onSelect={() => onSelect("tab_switch")}
        label={t("teacher_interview_gap_report.integrity.filter.tab_switch")}
        title={t("teacher_interview_gap_report.integrity.event.tab_switch")}
      />
      <IntegrityFilterTab
        icon={Maximize}
        count={counts.fullscreenExit}
        selected={filter === "fullscreen_exit"}
        warning={counts.fullscreenExit > 0}
        onSelect={() => onSelect("fullscreen_exit")}
        label={t(
          "teacher_interview_gap_report.integrity.filter.fullscreen_exit",
        )}
        title={t(
          "teacher_interview_gap_report.integrity.event.fullscreen_exit",
        )}
      />
      <IntegrityFilterTab
        icon={Eye}
        count={counts.focusLost}
        selected={filter === "focus_lost"}
        warning={false}
        onSelect={() => onSelect("focus_lost")}
        label={t("teacher_interview_gap_report.integrity.filter.focus_lost")}
        title={t("teacher_interview_gap_report.integrity.event.focus_lost")}
      />
    </div>
  );
}

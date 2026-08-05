import { Tabs, type TabDef } from "@/components/ui/tabs";

import { STATUS_FILTERS } from "./constants";
import type { AdminProcessingController } from "./use-admin-processing";

/**
 * Job-status tabs with per-status counts.
 *
 * Replaces two stacked blocks: the six StatCard counters and the separate
 * "Filter status:" pill row. Those duplicated the same six numbers — one row
 * showed them, the next row filtered by them — so the count now sits on the
 * control that applies it.
 *
 * Counts come from the SAME range-filtered jobs list the table renders
 * (computed in the controller), so the badges always agree with the rows —
 * the previous queue-depth source counted every job ever while the table
 * only fetched the last 7 days. While the jobs query loads, `count` is left
 * undefined and the badge is simply omitted rather than rendering a
 * placeholder 0, which would read as a real "no jobs" answer.
 *
 * The tab `value` is the API `?status=` string, so the dashboard's
 * `/admin/processing?status=failed` deep link still selects the Failed tab.
 */
export function JobsTabs({ c }: { c: AdminProcessingController }) {
  const { t, statusFilter, setStatusFilter, counts } = c;

  const tabs: TabDef<string>[] = STATUS_FILTERS.map((opt) => ({
    key: opt.value,
    label: t(opt.i18nKey),
    icon: opt.icon,
    count: counts ? counts[opt.countKey] : undefined,
  }));

  return (
    <Tabs
      tabs={tabs}
      value={statusFilter}
      onChange={setStatusFilter}
      ariaLabel={t("admin.processing.filter_status")}
    />
  );
}

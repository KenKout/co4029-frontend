import { CheckCheck, Trash2 } from "lucide-react";
import type { TFunction } from "i18next";

import {
  DataTableToolbar,
  type FilterDef,
  type TimeRange,
  type TimeRangeOption,
} from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import type { NotificationCategory } from "@/lib/api/types";

import { CATEGORY_ORDER } from "./helpers";
import type { NotificationsPageController } from "./use-notifications-page";

const STATUS_FILTER_ID = "status";
const CATEGORY_FILTER_ID = "category";

function buildTimeRangeOptions(t: TFunction): TimeRangeOption[] {
  return [
    { value: "today", label: t("notifications.time.today") },
    { value: "yesterday", label: t("notifications.time.yesterday") },
    { value: "week", label: t("notifications.time.week") },
    { value: "month", label: t("notifications.time.month") },
    { value: "6months", label: t("notifications.time.six_months") },
    { value: "year", label: t("notifications.time.year") },
    { value: "all", label: t("notifications.time.all") },
  ];
}

/**
 * The inbox toolbar — search + time range + read/unread + category, built on
 * the shared DataTableToolbar so this page matches the admin tables instead
 * of hand-rolled controls. Trailing holds the two bulk actions (mark all
 * read, delete read with a live count).
 */
export function NotificationsToolbar({
  c,
}: {
  c: NotificationsPageController;
}) {
  const { t } = c;

  const filters: FilterDef[] = [
    {
      id: STATUS_FILTER_ID,
      label: t("notifications.filter_status"),
      allLabel: t("notifications.filter_status_all"),
      options: [
        { value: "unread", label: t("notifications.filter_unread") },
        { value: "read", label: t("notifications.filter_read") },
      ],
    },
    {
      id: CATEGORY_FILTER_ID,
      label: t("notifications.filter_category"),
      allLabel: t("notifications.filter_category_all"),
      options: CATEGORY_ORDER.map((cat) => ({
        value: cat,
        label: t(`notifications.category.${cat}`, {
          defaultValue: cat,
        }),
      })),
    },
  ];

  return (
    <DataTableToolbar
      search={c.search}
      onSearchChange={c.setSearch}
      searchPlaceholder={t("notifications.search_placeholder")}
      timeRange={c.timeRange}
      onTimeRangeChange={(range: TimeRange) => c.setTimeRange(range)}
      timeRangeOptions={buildTimeRangeOptions(t)}
      timeRangeAriaLabel={t("notifications.filter_status")}
      filters={filters}
      filterValues={{ status: c.statusFilter, category: c.categoryFilter }}
      onFilterChange={(filterId, value) => {
        if (filterId === STATUS_FILTER_ID) {
          c.setStatusFilter(
            value === "unread" || value === "read"
              ? (value as "unread" | "read")
              : undefined,
          );
        } else {
          c.setCategoryFilter(value as NotificationCategory | undefined);
        }
      }}
      onResetAllFilters={c.resetFilters}
      clearLabel={t("notifications.clear_filters")}
      trailing={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={c.handleMarkAllRead}
            disabled={c.unreadCount === 0}
            className="gap-2 cursor-pointer"
          >
            <CheckCheck className="h-4 w-4" />
            {t("notifications.mark_all_read")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={c.handleDeleteRead}
            disabled={c.readCount === 0 || c.pendingDeletes.comboCount > 0}
            className="gap-2 cursor-pointer text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t("notifications.delete_read", { count: c.readCount })}
          </Button>
        </>
      }
    />
  );
}

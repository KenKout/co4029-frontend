import { useState } from "react";
import {
  CheckCheck,
  MoreVertical,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { TFunction } from "i18next";

import {
  DataTableToolbar,
  TimeRangeSelect,
  type FilterDef,
  type TimeRange,
  type TimeRangeOption,
} from "@/components/ui/data-table-toolbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
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

/** How many filter groups are currently active (badge on the Filters button). */
function activeFilterCount(c: NotificationsPageController): number {
  return (
    (c.timeRange !== "all" ? 1 : 0) +
    (c.statusFilter ? 1 : 0) +
    (c.categoryFilter ? 1 : 0)
  );
}

/**
 * Mobile filter sheet: the three desktop dropdowns (time range, status,
 * category) collapsed behind a bottom sheet, with a clear-all action.
 */
function FiltersSheet({
  c,
  open,
  onOpenChange,
}: {
  c: NotificationsPageController;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = c;
  const active = activeFilterCount(c);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-2xl p-6 pb-8 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-base font-bold text-text-strong">
            {t("notifications.filters")}
          </h2>
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                aria-label={t("common.close")}
              />
            }
          >
            <X className="h-4 w-4" />
          </SheetClose>
        </div>

        <div className="mt-5 space-y-5">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-m3-on-surface-variant">
              {t("notifications.time_range_label")}
            </span>
            <TimeRangeSelect
              value={c.timeRange}
              onChange={c.setTimeRange}
              options={buildTimeRangeOptions(t)}
              customRange={c.customRange}
              onCustomRangeChange={c.setCustomRange}
              labels={{
                ariaLabel: t("notifications.time_range_label"),
                customOption: t("notifications.time.custom"),
                dialogTitle: t("notifications.time.custom_title"),
                from: t("notifications.time.from"),
                to: t("notifications.time.to"),
                apply: t("notifications.time.apply"),
                clear: t("notifications.time.clear"),
              }}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-m3-on-surface-variant">
              {t("notifications.filter_status")}
            </span>
            <Select
              aria-label={t("notifications.filter_status")}
              value={c.statusFilter ?? ""}
              onValueChange={(next) =>
                c.setStatusFilter(
                  next === "unread" || next === "read" ? next : undefined,
                )
              }
              options={[
                {
                  value: "",
                  label: t("notifications.filter_status_all"),
                },
                {
                  value: "unread",
                  label: t("notifications.filter_unread"),
                },
                {
                  value: "read",
                  label: t("notifications.filter_read"),
                },
              ]}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-m3-on-surface-variant">
              {t("notifications.filter_category")}
            </span>
            <Select
              aria-label={t("notifications.filter_category")}
              value={c.categoryFilter ?? ""}
              onValueChange={(next) =>
                c.setCategoryFilter(next ? next : undefined)
              }
              options={[
                {
                  value: "",
                  label: t("notifications.filter_category_all"),
                },
                ...CATEGORY_ORDER.map((cat) => ({
                  value: cat,
                  label: t(`notifications.category.${cat}`, {
                    defaultValue: cat,
                  }),
                })),
              ]}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={active === 0}
            onClick={c.resetFilters}
            className="text-destructive hover:text-destructive cursor-pointer"
          >
            {t("notifications.clear_filters")}
          </Button>
          <SheetClose render={<Button size="sm" type="button" />}>
            {t("notifications.done")}
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Desktop toolbar — the shared DataTableToolbar (search + time range +
 * read/unread + category) with the two bulk actions.
 */
function DesktopNotificationsToolbar({ c }: { c: NotificationsPageController }) {
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
      customTimeRange={c.customRange}
      onCustomTimeRangeChange={c.setCustomRange}
      timeRangeLabels={{
        customOption: t("notifications.time.custom"),
        dialogTitle: t("notifications.time.custom_title"),
        from: t("notifications.time.from"),
        to: t("notifications.time.to"),
        apply: t("notifications.time.apply"),
        clear: t("notifications.time.clear"),
      }}
      filters={filters}
      filterValues={{ status: c.statusFilter, category: c.categoryFilter }}
      onFilterChange={(filterId, value) => {
        if (filterId === STATUS_FILTER_ID) {
          c.setStatusFilter(
            value === "unread" || value === "read" ? value : undefined,
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

/**
 * The inbox toolbar.
 *
 * Desktop (md+): the shared DataTableToolbar — search + time range +
 * read/unread + category with the two bulk actions.
 *
 * Mobile (<md): a full-width search box, a "Filters" button that opens the
 * filters in a bottom sheet (the three dropdowns don't fit a phone), the
 * always-visible "Mark all read", and a ⋮ menu holding "Delete read".
 */
export function NotificationsToolbar({
  c,
}: {
  c: NotificationsPageController;
}) {
  const { t } = c;
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Mobile toolbar — feed view. */}
      <div className="md:hidden space-y-2">
        <SearchInput
          value={c.search}
          onChange={(e) => c.setSearch(e.target.value)}
          placeholder={t("notifications.search_placeholder")}
          onClear={c.search ? () => c.setSearch("") : undefined}
          wrapperClassName="w-full"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
            className="gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("notifications.filters")}
            {activeFilterCount(c) > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-m3-primary px-1 text-[10px] font-bold text-white tabular-nums">
                {activeFilterCount(c)}
              </span>
            )}
          </Button>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={c.handleMarkAllRead}
              disabled={c.unreadCount === 0}
              className="gap-1.5 cursor-pointer"
            >
              <CheckCheck className="h-4 w-4" />
              {t("notifications.mark_all_read")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                aria-label={t("notifications.more_actions")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-m3-outline-variant/40 text-m3-on-surface-variant outline-none hover:text-m3-primary hover:bg-m3-primary/8 transition-colors cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  variant="destructive"
                  disabled={
                    c.readCount === 0 || c.pendingDeletes.comboCount > 0
                  }
                  onClick={c.handleDeleteRead}
                  className="cursor-pointer"
                >
                  <Trash2 className="size-4" />
                  {t("notifications.delete_read", { count: c.readCount })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <FiltersSheet c={c} open={sheetOpen} onOpenChange={setSheetOpen} />
      </div>

      {/* Desktop toolbar — table view. */}
      <div className="hidden md:block">
        <DesktopNotificationsToolbar c={c} />
      </div>
    </>
  );
}

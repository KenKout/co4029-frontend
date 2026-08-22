import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import type {
  CustomTimeRange,
  TimeRange,
} from "@/components/ui/data-table-toolbar";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  usePendingNotificationDeletes,
  useUnreadCount,
  useAllNotifications,
} from "@/lib/api/hooks/notifications";
import type {
  NotificationCategory,
} from "@/lib/api/types";

import {
  boundsFromCustomRange,
  filterNotifications,
  groupNotifications,
  type NotificationGroupBy,
  type NotificationStatusFilter,
} from "./helpers";

/**
 * Thin orchestrator for the notifications inbox page: loads the FULL inbox
 * (no pagination — `useAllNotifications` drains every page), exposes the
 * toolbar filter state (search / time range / read-unread / category), the
 * date-vs-type grouping toggle, and the read/delete mutations.
 *
 * Delete is deferred (5s undo, same as the quiz question delete): rows are
 * hidden immediately via `pendingIds`, then flushed server-side when the
 * countdown expires or the user leaves. "Delete read" stages every read
 * notification in the current filtered view.
 */
export function useNotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { items, isLoading } = useAllNotifications(100);
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.unread ?? 0;
  // Pull newly-arrived notifications into the open list without a reload.
  // (The app-wide arrival toast lives in AppShell's sync instance.)

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const pendingDeletes = usePendingNotificationDeletes();

  // ── Toolbar state ──
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [customRange, setCustomRange] = useState<CustomTimeRange | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] =
    useState<NotificationStatusFilter>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<
    NotificationCategory | undefined
  >(undefined);
  const [groupBy, setGroupBy] = useState<NotificationGroupBy>("date");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // A custom range resolves to explicit since/until ISO instants; presets go
  // through the shared cutoff helper (until stays unset).
  const customBounds = useMemo(
    () => (timeRange === "custom" ? boundsFromCustomRange(customRange) : undefined),
    [timeRange, customRange],
  );

  // Filtered view = full inbox after the toolbar filters, minus rows staged
  // for deletion (they're hidden instantly, like the quiz question delete).
  const visible = useMemo(
    () =>
      filterNotifications(items, {
        search,
        since: customBounds?.since,
        timeRange,
        until: customBounds?.until,
        status: statusFilter,
        category: categoryFilter,
      }).filter((n) => !pendingDeletes.pendingIds.has(n.id)),
    [items, search, timeRange, customBounds, statusFilter, categoryFilter, pendingDeletes.pendingIds],
  );

  const groups = useMemo(
    () => groupNotifications(visible, groupBy),
    [visible, groupBy],
  );

  const readCount = useMemo(
    () => visible.filter((n) => n.read_at !== null).length,
    [visible],
  );

  function handleMarkRead(id: string) {
    markRead.mutate(id, {
      onError: (err) =>
        toast.error(err.message || t("notifications.errors.mark_read_failed")),
    });
  }

  function handleDelete(id: string) {
    const item = items.find((n) => n.id === id);
    pendingDeletes.queueDelete({ id, label: item?.title ?? id });
  }

  function handleDeleteRead() {
    for (const n of visible) {
      if (n.read_at !== null) pendingDeletes.queueDelete({ id: n.id, label: n.title });
    }
  }

  function handleMarkAllRead() {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success(t("notifications.success.all_marked")),
      onError: (err) =>
        toast.error(err.message || t("notifications.errors.mark_all_failed")),
    });
  }

  function resetFilters() {
    setSearch("");
    setTimeRange("all");
    setCustomRange(undefined);
    setStatusFilter(undefined);
    setCategoryFilter(undefined);
  }

  function navigateTo(path: string) {
    void navigate({ to: path });
  }

  const rowBusy = markRead.isPending;

  return {
    t,
    items,
    isLoading,
    unreadCount,
    groups,
    visibleCount: visible.length,
    readCount,
    rowBusy,
    pendingDeletes,
    expandedId,
    setExpandedId,
    // toolbar state
    search,
    setSearch,
    timeRange,
    setTimeRange,
    customRange,
    setCustomRange,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    groupBy,
    setGroupBy,
    resetFilters,
    // actions
    handleMarkRead,
    handleDelete,
    handleDeleteRead,
    handleMarkAllRead,
    navigateTo,
  };
}

export type NotificationsPageController = ReturnType<typeof useNotificationsPage>;

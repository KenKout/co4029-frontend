import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Mail,
  SearchX,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { notificationDeepLink } from "@/lib/notifications/deep-link";
import type { Notification } from "@/lib/api/types";

import { NotificationBody } from "./NotificationBody";
import type { NotificationGroup } from "./helpers";
import type { NotificationsPageController } from "./use-notifications-page";

/**
 * Row model for the hierarchical inbox table: a time-group PARENT row carries
 * its notifications as children (via `getSubRows`), so the DataTable's own
 * expand/collapse chevrons render the groups — no hand-rolled section
 * headers. Notification rows render in the columns; group rows render their
 * label + count.
 */
type TableRow =
  | {
      kind: "group";
      key: string;
      label: string;
      count: number;
      children: Notification[];
    }
  | { kind: "notification"; notification: Notification };

function buildRows(
  t: (key: string, opts?: Record<string, unknown>) => string,
  groups: NotificationGroup[],
): TableRow[] {
  return groups.map((g) => ({
    kind: "group",
    key: g.key,
    label: t(`notifications.group_${g.key}`, { defaultValue: g.key }),
    count: g.items.length,
    children: g.items,
  }));
}

/**
 * The three data columns: the notification itself (icon + title + body +
 * time), its read status, and its category. Group rows render their label +
 * count in the first column and nothing in the other two.
 */
function buildColumns(
  t: (key: string, opts?: Record<string, unknown>) => string,
  c: NotificationsPageController,
): DataTableColumn<TableRow>[] {
  return [
    {
      id: "notification",
      header: t("notifications.table_notification", {
        defaultValue: "Notification",
      }),
      cell: (row) =>
        row.kind === "group" ? (
          <span className="inline-flex items-center gap-2 font-headline font-bold text-m3-on-surface">
            {row.label}
            <span className="rounded-full bg-m3-surface-container-high px-2 py-0.5 text-[11px] font-bold text-m3-on-surface-variant tabular-nums">
              {row.count}
            </span>
          </span>
        ) : (
          <NotificationCell
            notification={row.notification}
            onLinkNavigate={c.navigateTo}
            onMarkRead={c.handleMarkRead}
          />
        ),
    },
    {
      id: "status",
      header: t("notifications.filter_status"),
      cell: (row) =>
        row.kind === "notification" ? (
          row.notification.read_at === null ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-m3-secondary">
              <span className="h-2 w-2 rounded-full bg-m3-secondary" />
              {t("notifications.filter_unread")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-m3-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-m3-outline" />
              {t("notifications.filter_read")}
            </span>
          )
        ) : null,
    },
    {
      id: "category",
      header: t("notifications.filter_category"),
      cell: (row) =>
        row.kind === "notification" ? (
          <span className="text-xs font-medium text-m3-on-surface-variant">
            {t(`notifications.category.${row.notification.category}`, {
              defaultValue: row.notification.category,
            })}
          </span>
        ) : null,
    },
  ];
}

/**
 * The inbox as a hierarchical data table: time-group parent rows (Today /
 * Yesterday / This week / Earlier) expand to their notification children, and
 * a sticky icon action column carries the per-row actions (take action, mark
 * read, delete). Loading, empty and filtered-empty states ride the DataTable's
 * own props. Row click on a deep-linked notification auto-marks read and
 * navigates; group rows are pure containers.
 */
export function NotificationsList({ c }: { c: NotificationsPageController }) {
  const { t } = useTranslation();
  const columns = buildColumns(t, c);
  const rows = buildRows(t, c.groups);

  return (
    <DataTable<TableRow>
      columns={columns}
      data={rows}
      getRowId={(row) =>
        row.kind === "group" ? `group:${row.key}` : row.notification.id
      }
      getSubRows={(row) =>
        row.kind === "group"
          ? row.children.map(
              (n): TableRow => ({ kind: "notification", notification: n }),
            )
          : undefined
      }
      defaultExpanded
      loading={c.isLoading}
      loadingRowCount={3}
      emptyState={
        c.items.length === 0 ? (
          <EmptyState
            icon={Mail}
            title={t("notifications.empty_title")}
            description={t("notifications.empty_body")}
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title={t("notifications.empty_filtered_title")}
            description={t("notifications.empty_filtered_body")}
            cta={
              <button
                type="button"
                onClick={c.resetFilters}
                className="h-9 rounded-lg px-4 text-sm font-semibold text-m3-primary hover:bg-m3-primary-fixed transition-colors cursor-pointer"
              >
                {t("notifications.clear_filters")}
              </button>
            }
          />
        )
      }
      rowClassName={(row) =>
        row.kind === "notification" && row.notification.read_at === null
          ? "bg-m3-secondary-fixed/10"
          : undefined
      }
      onRowClick={(row) => {
        if (row.kind !== "notification") return;
        const deepLink = notificationDeepLink(row.notification);
        if (!deepLink) return;
        if (row.notification.read_at === null) {
          c.handleMarkRead(row.notification.id);
        }
        c.navigateTo(deepLink);
      }}
      actionsHeader=""
      actions={(row) =>
        row.kind === "group" ? null : (
          <div className="flex items-center justify-end gap-0.5">
            {notificationDeepLink(row.notification) && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={c.rowBusy}
                onClick={() => {
                  if (row.notification.read_at === null) {
                    c.handleMarkRead(row.notification.id);
                  }
                  c.navigateTo(notificationDeepLink(row.notification)!);
                }}
                title={t("notifications.take_action")}
                aria-label={t("notifications.take_action")}
                className="text-m3-on-surface-variant hover:text-m3-primary"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {row.notification.read_at === null && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={c.rowBusy}
                onClick={() => c.handleMarkRead(row.notification.id)}
                title={t("notifications.mark_read")}
                aria-label={t("notifications.mark_read")}
                className="text-m3-on-surface-variant hover:text-m3-primary"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={c.rowBusy}
              onClick={() => c.handleDelete(row.notification.id)}
              title={t("notifications.delete")}
              aria-label={t("notifications.delete")}
              className="text-m3-on-surface-variant hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    />
  );
}

/** The notification's main column content: icon, title, category badge,
 *  body snippet and timestamp. */
function NotificationCell({
  notification,
  onLinkNavigate,
  onMarkRead,
}: {
  notification: Notification;
  onLinkNavigate: (path: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const isRead = notification.read_at !== null;

  // Click-through auto-marks the notification read (agreed behaviour): acting
  // on a deep-linked row makes it read. Fire-and-forget; the mutation is
  // idempotent.
  function navigateAndMarkRead(path: string) {
    if (!isRead) onMarkRead(notification.id);
    onLinkNavigate(path);
  }

  return (
    <div className="flex items-start gap-3 min-w-0 py-1">
      <div className="w-8 h-8 rounded-lg bg-m3-primary-fixed flex items-center justify-center shrink-0 mt-0.5">
        {isRead ? (
          <Eye className="h-4 w-4 text-m3-primary" />
        ) : (
          <EyeOff className="h-4 w-4 text-m3-primary" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-m3-on-surface">
            {notification.title}
          </p>
        </div>
        {notification.body && (
          <NotificationBody
            body={notification.body}
            expanded={false}
            onLinkNavigate={navigateAndMarkRead}
          />
        )}
        <p className="text-xs text-m3-outline">
          {new Date(notification.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

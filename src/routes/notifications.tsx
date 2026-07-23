import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/lib/api/hooks/notifications";
import {
  notificationDeepLink,
  parseNotificationBody,
} from "@/lib/notifications/deep-link";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Notification } from "@/lib/api/types";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Eye,
  EyeOff,
  Mail,
  Trash2,
} from "lucide-react";

const SNIPPET_LIMIT = 200;

function snippet(body: string): string {
  if (body.length <= SNIPPET_LIMIT) return body;
  return `${body.slice(0, SNIPPET_LIMIT).trimEnd()}…`;
}

function NotificationBody({
  body,
  expanded,
  onLinkNavigate,
}: {
  body: string;
  expanded: boolean;
  onLinkNavigate: (url: string) => void;
}) {
  const { t } = useTranslation();
  const text = expanded ? body : snippet(body);
  const segments = parseNotificationBody(text);
  if (segments.length === 0) return null;
  return (
    <p
      className={`text-sm text-m3-on-surface-variant whitespace-pre-line ${
        expanded ? "" : "line-clamp-3"
      }`}
    >
      {segments.map((seg, i) =>
        seg.type === "link" ? (
          <a
            key={i}
            href={seg.url}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLinkNavigate(seg.url);
            }}
            className="text-m3-primary underline underline-offset-2 hover:text-m3-secondary"
            aria-label={t("notifications.open_link")}
          >
            {seg.label}
          </a>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  );
}

function NotificationRow({
  notification,
  expanded,
  onToggle,
  onNavigate,
  onMarkRead,
  onDelete,
  busy,
}: {
  notification: Notification;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (path: string) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const isRead = notification.read_at !== null;
  const categoryLabel = t(`notifications.category.${notification.category}`, {
    defaultValue: notification.category,
  });
  const deepLink = notificationDeepLink(notification);

  // Click-through auto-marks the notification read (agreed behaviour): if the
  // student is acting on it, it's no longer unread. Mark first (fire-and-
  // forget; the mutation is idempotent), then navigate. Applies to the row
  // click, the "Take action" button, and inline body links.
  function navigateAndMarkRead(path: string) {
    if (!isRead) onMarkRead(notification.id);
    onNavigate(path);
  }

  function handleClick() {
    if (deepLink) {
      navigateAndMarkRead(deepLink);
    } else {
      onToggle();
    }
  }

  return (
    <div
      className={`group/row w-full flex items-start gap-4 p-4 rounded-xl transition-colors hover:bg-m3-surface-container-low ${
        isRead ? "opacity-70" : "bg-m3-secondary-fixed/15"
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        className="flex items-start gap-4 flex-1 min-w-0 text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-m3-primary-fixed flex items-center justify-center shrink-0">
          {isRead ? (
            <Eye className="h-4 w-4 text-m3-primary" />
          ) : (
            <EyeOff className="h-4 w-4 text-m3-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-m3-on-surface">
              {notification.title}
            </p>
            <Badge variant="secondary" className="shrink-0">
              {categoryLabel}
            </Badge>
          </div>
          {notification.body && (
            <NotificationBody
              body={notification.body}
              expanded={expanded}
              onLinkNavigate={navigateAndMarkRead}
            />
          )}
          <p className="text-xs text-m3-outline">
            {new Date(notification.created_at).toLocaleString()}
          </p>
        </div>

        {!isRead && (
          <div className="w-2 h-2 rounded-full bg-m3-secondary shrink-0 mt-2" />
        )}
      </button>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {deepLink && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              navigateAndMarkRead(deepLink);
            }}
            className="gap-1.5 whitespace-nowrap"
          >
            {t("notifications.take_action")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
        {!isRead && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
            aria-label={t("notifications.mark_read")}
            title={t("notifications.mark_read")}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          aria-label={t("notifications.delete")}
          title={t("notifications.delete")}
          className="text-m3-on-surface-variant hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { items, hasNextPage, fetchNextPage, isFetchingNextPage, isLoading } =
    useNotifications(20);

  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.unread ?? 0;

  const markRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();
  const markAllRead = useMarkAllNotificationsRead();

  function handleMarkRead(id: string) {
    markRead.mutate(id, {
      onError: (err) =>
        toast.error(
          (err as Error).message || t("notifications.errors.mark_read_failed"),
        ),
    });
  }

  function handleDelete(id: string) {
    deleteNotification.mutate(id, {
      onError: (err) =>
        toast.error(
          (err as Error).message || t("notifications.errors.delete_failed"),
        ),
    });
  }

  function handleMarkAllRead() {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success(t("notifications.success.all_marked")),
      onError: (err) =>
        toast.error(
          (err as Error).message || t("notifications.errors.mark_all_failed"),
        ),
    });
  }

  const rowBusy = markRead.isPending || deleteNotification.isPending;

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-3xl mx-auto pb-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <SectionHeader
            title={t("notifications.title")}
            subtitle={t("notifications.subtitle")}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markAllRead.isPending}
            className="gap-2 cursor-pointer"
          >
            <CheckCheck className="h-4 w-4" />
            {t("notifications.mark_all_read")}
          </Button>
        </div>

        <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            <InfiniteList<Notification>
              items={items}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              isLoading={isLoading}
              keyOf={(n) => n.id}
              className="p-3 space-y-1"
              renderItem={(n) => (
                <NotificationRow
                  notification={n}
                  expanded={expandedId === n.id}
                  onToggle={() =>
                    setExpandedId((prev) => (prev === n.id ? null : n.id))
                  }
                  onNavigate={(path) => {
                    void navigate({ to: path });
                  }}
                  onMarkRead={handleMarkRead}
                  onDelete={handleDelete}
                  busy={rowBusy}
                />
              )}
              empty={
                <EmptyState
                  icon={Mail}
                  title={t("notifications.empty_title")}
                  description={t("notifications.empty_body")}
                />
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

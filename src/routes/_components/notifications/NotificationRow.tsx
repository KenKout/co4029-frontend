import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Eye, EyeOff, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notificationDeepLink } from "@/lib/notifications/deep-link";
import type { Notification } from "@/lib/api/types";

import { NotificationBody } from "./NotificationBody";

export function NotificationRow({
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

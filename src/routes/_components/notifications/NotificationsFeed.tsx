import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Check,
  Mail,
  MoreVertical,
  SearchX,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { notificationDeepLink } from "@/lib/notifications/deep-link";
import type { Notification } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { isCategoryKey } from "./helpers";

import { NotificationBody } from "./NotificationBody";
import type { NotificationsPageController } from "./use-notifications-page";

/**
 * Compact timestamp for the card: "22:00 · 13/8/2026". Pinned to vi-VN so
 * the shape is deterministic (24h time, unpadded day/month/year — the
 * wireframe's format) regardless of the browser's locale.
 */
function formatCardTimestamp(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = d.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  return `${time} · ${date}`;
}

/**
 * One stacked notification card (mobile feed). Unread cards get a light
 * blue background + a blue dot before the title. The footer carries what
 * the desktop table shows as columns — status, category — plus the
 * take-action arrow and the ⋮ action menu.
 */
function FeedCard({
  notification,
  c,
}: {
  notification: Notification;
  c: NotificationsPageController;
}) {
  const { t } = c;
  const isRead = notification.read_at !== null;
  const deepLink = notificationDeepLink(notification);

  function navigateAndMarkRead(path: string) {
    if (!isRead) c.handleMarkRead(notification.id);
    c.navigateTo(path);
  }

  return (
    <div
      onClick={() => deepLink && navigateAndMarkRead(deepLink)}
      className={cn(
        "rounded-xl border border-m3-outline-variant/30 bg-white p-4 shadow-sm cursor-pointer transition-colors",
        !isRead && "bg-m3-secondary-fixed/10 border-m3-secondary/25",
      )}
    >
      {/* Title with the unread dot. */}
      <div className="flex items-start gap-2">
        {!isRead && (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-m3-secondary"
            aria-hidden
          />
        )}
        <p className="text-sm font-semibold text-m3-on-surface">
          {notification.title}
        </p>
      </div>

      {notification.body && (
        <div className="mt-1.5">
          <NotificationBody
            body={notification.body}
            expanded={false}
            onLinkNavigate={navigateAndMarkRead}
          />
        </div>
      )}

      <p className="mt-2 text-xs text-m3-outline tabular-nums">
        {formatCardTimestamp(notification.created_at)}
      </p>

      {/* Footer: status · category | → ⋮ (stops the card's click). */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-m3-outline-variant/20 pt-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-m3-on-surface-variant min-w-0">
          {!isRead && (
            <span className="font-semibold text-m3-secondary shrink-0">
              {t("notifications.filter_unread")}
            </span>
          )}
          {!isRead && <span aria-hidden className="shrink-0">·</span>}
          <span className="truncate">
            {t(`notifications.category.${notification.category}`, {
              defaultValue: notification.category,
            })}
          </span>
        </div>

        <div
          className="flex items-center gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {deepLink && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={c.rowBusy}
              onClick={() => navigateAndMarkRead(deepLink)}
              title={t("notifications.take_action")}
              aria-label={t("notifications.take_action")}
              className="text-m3-on-surface-variant hover:text-m3-primary cursor-pointer"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              aria-label={t("notifications.more_actions")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant outline-none hover:text-m3-primary hover:bg-m3-primary/8 transition-colors cursor-pointer"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {!isRead && (
                <DropdownMenuItem
                  onClick={() => c.handleMarkRead(notification.id)}
                  disabled={c.rowBusy}
                  className="cursor-pointer"
                >
                  <Check className="size-4" />
                  {t("notifications.mark_read")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant="destructive"
                onClick={() => c.handleDelete(notification.id)}
                disabled={c.rowBusy}
                className="cursor-pointer"
              >
                <Trash2 className="size-4" />
                {t("notifications.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile-only notification feed: date/category group headers (e.g.
 * "Yesterday · 4") above stacked cards. Desktop keeps the DataTable —
 * see NotificationsList. Loading, empty and filtered-empty states mirror
 * the table's.
 */
export function NotificationsFeed({
  c,
}: {
  c: NotificationsPageController;
}) {
  const { t } = useTranslation();

  if (c.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-m3-surface-container animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (c.items.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title={t("notifications.empty_title")}
        description={t("notifications.empty_body")}
      />
    );
  }

  if (c.visibleCount === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={t("notifications.empty_filtered_title")}
        description={t("notifications.empty_filtered_body")}
        cta={
          <Button
            variant="ghost"
            type="button"
            onClick={c.resetFilters}
            className="h-9 rounded-lg px-4 text-sm font-semibold text-m3-primary hover:bg-m3-primary-fixed transition-colors cursor-pointer"
          >
            {t("notifications.clear_filters")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {c.groups.map((group) => (
        <section key={group.key}>
          <h2 className="flex items-center gap-2 font-headline font-bold text-sm text-m3-on-surface-variant">
            {t(
              isCategoryKey(group.key)
                ? `notifications.category.${group.key}`
                : `notifications.group_${group.key}`,
              { defaultValue: group.key },
            )}
            <span className="text-xs font-bold tabular-nums text-m3-outline">
              · {group.items.length}
            </span>
          </h2>
          <div className="mt-2 space-y-3">
            {group.items.map((n) => (
              <FeedCard key={n.id} notification={n} c={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMarkNotificationRead } from "@/lib/api/hooks/notifications";
import { notificationDeepLink } from "@/lib/notifications/deep-link";
import type { Notification } from "@/lib/api/types";
import NotificationItem from "./NotificationItem";
import type { NotificationsSectionController } from "./types";

export default function NotificationsSection({
  inbox,
}: {
  inbox: NotificationsSectionController;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const { notifications, notificationsLoading, unreadCount } = inbox;

  // Same contract as the notification page: a click on a deep-linked
  // notification auto-marks it read and navigates to the item's action_url
  // (or the single-id fallback). Rows without a deep link do nothing.
  function openNotification(notification: Notification) {
    const deepLink = notificationDeepLink(notification);
    if (!deepLink) return;
    if (notification.read_at === null) {
      markRead.mutate(notification.id);
    }
    void navigate({ to: deepLink });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader
          title={t("dashboard.notifications_section")}
          subtitle={
            unreadCount > 0
              ? t("dashboard.unread_n", { count: unreadCount })
              : t("dashboard.all_caught_up")
          }
        />
        {notifications.length > 0 && (
          <Link
            to="/notifications"
            className="inline-flex items-center gap-1 text-xs font-semibold text-m3-secondary hover:underline shrink-0"
          >
            {t("dashboard.view_all")}
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border overflow-hidden">
        {notificationsLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={t("dashboard.empty_notifications_title")}
            description={t("dashboard.empty_notifications_body")}
          />
        ) : (
          <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
            {notifications.slice(0, 8).map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={openNotification}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

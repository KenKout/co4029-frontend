import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import NotificationItem from "./NotificationItem";
import type { NotificationsSectionController } from "./types";

export default function NotificationsSection({
  inbox,
}: {
  inbox: NotificationsSectionController;
}) {
  const { t } = useTranslation();
  const { notifications, notificationsLoading, unreadCount } = inbox;

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
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

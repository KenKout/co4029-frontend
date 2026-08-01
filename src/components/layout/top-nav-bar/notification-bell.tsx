import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import type { TFunction } from "i18next";

export function TopNavBell({
  unreadCount,
  t,
}: {
  unreadCount: number;
  t: TFunction;
}) {
  return (
    <Link
      to="/notifications"
      className="relative text-m3-on-surface-variant cursor-pointer hover:bg-m3-primary-fixed p-2.5 rounded-full transition-colors"
      aria-label={
        unreadCount > 0
          ? t("notifications.bell_aria_unread", {
              count: unreadCount,
              defaultValue: "Notifications, {{count}} unread",
            })
          : t("notifications.bell_aria", {
              defaultValue: "Notifications",
            })
      }
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-m3-secondary px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

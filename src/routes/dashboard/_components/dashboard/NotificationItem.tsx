import { Bell, CheckCircle2, FileText, Mic } from "lucide-react";
import type { Notification } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export default function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick?: (notification: Notification) => void;
}) {
  const isRead = notification.read_at !== null;
  const clickable = onClick !== undefined;
  const icon =
    notification.category === "quiz_ready"
      ? FileText
      : notification.category === "interview_ready"
        ? Mic
        : notification.category === "progress"
          ? CheckCircle2
          : Bell;

  const Icon = icon;

  function activate() {
    onClick?.(notification);
  }

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? activate : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                activate();
              }
            }
          : undefined
      }
      aria-label={clickable ? notification.title : undefined}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl transition-colors",
        isRead ? "opacity-60" : "bg-m3-secondary-fixed/20",
        clickable && "cursor-pointer hover:bg-m3-surface-container-low",
      )}
    >
      <div className="w-8 h-8 rounded-xl gradient-secondary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-m3-on-surface">
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-m3-on-surface-variant mt-0.5 line-clamp-1">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-m3-outline mt-1">
          {new Date(notification.created_at).toLocaleDateString()}
        </p>
      </div>
      {!isRead && (
        <div className="w-2 h-2 rounded-full bg-m3-secondary shrink-0 mt-1.5" />
      )}
    </div>
  );
}
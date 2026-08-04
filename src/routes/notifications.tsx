import { SectionHeader } from "@/components/ui/section-header";
import { UndoCountdownBanner } from "@/components/ui/undo-countdown-banner";

import { GroupByToggle } from "./_components/notifications/GroupByToggle";
import { NotificationsList } from "./_components/notifications/NotificationsList";
import { NotificationsToolbar } from "./_components/notifications/NotificationsToolbar";
import { useNotificationsPage } from "./_components/notifications/use-notifications-page";

/**
 * Notifications inbox. Built on the shared DataTableToolbar (search + time
 * range + read/unread + category) with client-side filtering/grouping over
 * the FULL inbox (no pagination), a delete-read bulk action, and the same
 * 5-second undo-on-delete as the teacher question delete.
 *
 * Thin orchestrator: state and mutations live in `useNotificationsPage`,
 * every piece of the surface in `_components/notifications/`.
 */
export default function NotificationsPage() {
  const c = useNotificationsPage();
  const { t } = c;

  return (
    <div className="min-h-screen pb-16">
      <div className="w-full space-y-6">
        <SectionHeader
          title={t("notifications.title")}
          subtitle={t("notifications.subtitle")}
        />

        {/* Toolbar: search + time range + status/category filters + bulk
            actions (mark all read, delete read). */}
        <NotificationsToolbar c={c} />

        {/* Grouping toggle */}
        <div className="flex items-center justify-between gap-3">
          <GroupByToggle
            value={c.groupBy}
            onChange={c.setGroupBy}
            dateLabel={t("notifications.group_date")}
            typeLabel={t("notifications.group_type")}
            ariaLabel={t("notifications.group_by")}
          />
          <p className="text-xs text-m3-on-surface-variant">
            {t("notifications.showing_count", { count: c.visibleCount })}
          </p>
        </div>

        <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border overflow-hidden">
          <NotificationsList c={c} />
        </div>
      </div>

      {/* 5s undo on delete (same countdown banner as the quiz question
          delete). */}
      {c.pendingDeletes.comboCount > 0 && (
        <UndoCountdownBanner
          secondsLeft={c.pendingDeletes.secondsLeft}
          totalSeconds={5}
          message={t("notifications.undo_message", {
            count: c.pendingDeletes.comboCount,
          })}
          undoLabel={t("notifications.undo", {
            count: c.pendingDeletes.comboCount,
          })}
          onUndo={c.pendingDeletes.undo}
        />
      )}
    </div>
  );
}

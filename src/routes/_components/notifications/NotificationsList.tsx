import { Mail, SearchX } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

import { NotificationRow } from "./NotificationRow";
import type { NotificationGroup } from "./helpers";
import type { NotificationsPageController } from "./use-notifications-page";

function groupLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  group: NotificationGroup,
  groupBy: "date" | "type",
): string {
  if (groupBy === "type") {
    return t(`notifications.category.${group.key}`, {
      defaultValue: group.key,
    });
  }
  return t(`notifications.group_${group.key}`);
}

/**
 * The grouped inbox — one section header per date bucket or category, with
 * the notification rows beneath. Empty-state branches: full skeleton while
 * loading, "no notifications at all" when the inbox is empty, and a
 * filtered-empty state when filters/search match nothing.
 */
export function NotificationsList({ c }: { c: NotificationsPageController }) {
  const { t } = c;

  if (c.isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
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
          <button
            type="button"
            onClick={c.resetFilters}
            className="h-9 rounded-lg px-4 text-sm font-semibold text-m3-primary hover:bg-m3-primary-fixed transition-colors cursor-pointer"
          >
            {t("notifications.clear_filters")}
          </button>
        }
      />
    );
  }

  return (
    <div className="p-3 space-y-4">
      {c.groups.map((group) => (
        <section key={group.key} aria-label={groupLabel(t, group, c.groupBy)}>
          <h3 className="px-2 pt-2 pb-1 text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant flex items-center gap-2">
            {groupLabel(t, group, c.groupBy)}
            <span className="text-m3-outline font-semibold">
              {group.items.length}
            </span>
          </h3>
          <div className="space-y-1">
            {group.items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                expanded={c.expandedId === n.id}
                onToggle={() =>
                  c.setExpandedId((prev) => (prev === n.id ? null : n.id))
                }
                onNavigate={c.navigateTo}
                onMarkRead={c.handleMarkRead}
                onDelete={c.handleDelete}
                busy={c.rowBusy}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

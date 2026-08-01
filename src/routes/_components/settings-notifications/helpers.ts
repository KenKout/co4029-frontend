import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPreferenceRead,
} from "@/lib/api/types";

export function isEnabled(
  prefs: NotificationPreferenceRead[] | undefined,
  category: NotificationCategory,
  channel: NotificationChannel,
): boolean {
  if (!prefs) return true;
  const row = prefs.find(
    (p) => p.category === category && p.channel === channel,
  );
  return row ? row.enabled : true;
}

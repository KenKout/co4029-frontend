import type {
  NotificationCategory,
  NotificationChannel,
} from "@/lib/api/types";

/**
 * Shared types for the notification-preferences matrix, extracted from
 * `settings-notifications.tsx` so the desktop table and the mobile list render
 * from one precomputed shape instead of each re-deriving it.
 */

export interface PreferenceCell {
  channel: NotificationChannel;
  enabled: boolean;
}

export interface PreferenceRow {
  id: NotificationCategory;
  label: string;
  cells: PreferenceCell[];
}

export type ToggleHandler = (
  category: NotificationCategory,
  channel: NotificationChannel,
  nextEnabled: boolean,
) => void;

/** Everything the two matrix renderers need from the page shell. */
export interface PreferenceMatrixController {
  matrix: PreferenceRow[];
  isPatching: boolean;
  onToggle: ToggleHandler;
}

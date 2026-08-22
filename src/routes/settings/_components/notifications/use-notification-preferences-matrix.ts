import { useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  useNotificationPreferences,
  usePatchNotificationPreference,
} from "@/lib/api/hooks/notifications";
import type {
  NotificationCategory,
  NotificationChannel,
} from "@/lib/api/types";
import { CATEGORY_IDS, CHANNEL_IDS } from "./constants";
import { isEnabled } from "./helpers";
import type { PreferenceMatrixController } from "./types";

/** The `error` shape react-query hands back, so the load-failure copy keeps the
 * exact typing it had while it lived inline in the page. */
type PrefsQueryError = ReturnType<typeof useNotificationPreferences>["error"];

/**
 * Notification-preference matrix controller.
 *
 * Hook order matches the order the former inline `SettingsNotificationsPage`
 * used (useTranslation → useRouter → useNavigate → useNotificationPreferences →
 * usePatchNotificationPreference → useMemo), and the memo keeps the same
 * `[prefs, t]` dependency array.
 */
export function useNotificationPreferencesMatrix(): PreferenceMatrixController & {
  isLoading: boolean;
  isError: boolean;
  error: PrefsQueryError;
  goBack: () => void;
} {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const {
    data: prefs,
    isLoading,
    isError,
    error,
  } = useNotificationPreferences();
  const patch = usePatchNotificationPreference();

  // Settings sub-pages are typically reached from /settings; fall back there
  // if the user lands here directly (refresh / deep link) so the back button
  // never becomes a no-op.
  function goBack() {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      void navigate({ to: "/settings" });
    }
  }

  const matrix = useMemo(
    () =>
      CATEGORY_IDS.map((id) => ({
        id,
        label: t(`settings_notifications.category.${id}`),
        cells: CHANNEL_IDS.map((ch) => ({
          channel: ch,
          enabled: isEnabled(prefs, id, ch),
        })),
      })),
    [prefs, t],
  );

  function handleToggle(
    category: NotificationCategory,
    channel: NotificationChannel,
    nextEnabled: boolean,
  ) {
    patch.mutate(
      { category, channel, enabled: nextEnabled },
      {
        onError: (err) =>
          toast.error(
            (err as Error).message ||
              t("settings_notifications.errors.patch_failed"),
          ),
      },
    );
  }

  return {
    matrix,
    isPatching: patch.isPending,
    onToggle: handleToggle,
    isLoading,
    isError,
    error,
    goBack,
  };
}

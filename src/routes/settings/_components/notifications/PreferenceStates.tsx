import { useTranslation } from "react-i18next";
import { Bell, Loader2 } from "lucide-react";

export function PreferencesLoading() {
  return (
    <div className="p-8 flex items-center justify-center text-m3-on-surface-variant">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

export function PreferencesLoadError({ error }: { error: Error | null }) {
  const { t } = useTranslation();
  return (
    <div className="p-8 text-center space-y-2">
      <div className="w-12 h-12 rounded-xl bg-m3-error-container flex items-center justify-center mx-auto">
        <Bell className="h-6 w-6 text-m3-on-error-container" />
      </div>
      <p className="text-sm font-semibold text-m3-on-surface">
        {t("settings_notifications.load_failed")}
      </p>
      <p className="text-xs text-m3-on-surface-variant">
        {(error as Error)?.message ?? t("settings_notifications.retry_hint")}
      </p>
    </div>
  );
}

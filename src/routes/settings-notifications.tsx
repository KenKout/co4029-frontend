import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import PreferenceMatrixList from "./_components/settings-notifications/PreferenceMatrixList";
import PreferenceMatrixTable from "./_components/settings-notifications/PreferenceMatrixTable";
import {
  PreferencesLoadError,
  PreferencesLoading,
} from "./_components/settings-notifications/PreferenceStates";
import { useNotificationPreferencesMatrix } from "./_components/settings-notifications/use-notification-preferences-matrix";

export default function SettingsNotificationsPage() {
  const { t } = useTranslation();
  const controller = useNotificationPreferencesMatrix();
  const { isLoading, isError, error, goBack } = controller;

  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto max-w-2xl space-y-6 p-6 pb-6">
        <PageHeader
          title={t("settings_notifications.title")}
          subtitle={t("settings_notifications.subtitle")}
          onBack={goBack}
        />

        <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border overflow-hidden">
          {isLoading ? (
            <PreferencesLoading />
          ) : isError ? (
            <PreferencesLoadError error={error} />
          ) : (
            <>
              <PreferenceMatrixTable controller={controller} />
              <PreferenceMatrixList controller={controller} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

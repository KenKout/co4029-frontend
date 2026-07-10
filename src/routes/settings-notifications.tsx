import { useMemo } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useNotificationPreferences,
  usePatchNotificationPreference,
} from "@/lib/api/hooks/notifications";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPreferenceRead,
} from "@/lib/api/types";

const CATEGORY_IDS: NotificationCategory[] = [
  "spaced_repetition",
  "lesson_unlock",
  "interview_result",
  "course_announcement",
  "system",
];

const CHANNEL_IDS: NotificationChannel[] = ["email", "in_app"];

function isEnabled(
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

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-m3-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-m3-primary" : "bg-m3-surface-container-high"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-surface-elev shadow-editorial transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsNotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const { data: prefs, isLoading, isError, error } =
    useNotificationPreferences();
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
            (err as Error).message || t("settings_notifications.errors.patch_failed"),
          ),
      },
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-3xl mx-auto pb-6 space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goBack}
            aria-label={t("settings_hub.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-m3-on-surface-variant">
            {t("settings_hub.back")}
          </span>
        </div>
        <SectionHeader
          title={t("settings_notifications.title")}
          subtitle={t("settings_notifications.subtitle")}
        />

        <div className="bg-m3-surface-container-lowest rounded-xl shadow-editorial ghost-border overflow-hidden">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center text-m3-on-surface-variant">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : isError ? (
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
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-m3-surface-container-low">
                      <TableHead>{t("settings_notifications.category_col")}</TableHead>
                      {CHANNEL_IDS.map((ch) => (
                        <TableHead key={ch} className="text-center w-32">
                          {t(`settings_notifications.channel.${ch}`)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matrix.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="py-4 font-medium text-m3-on-surface">
                          {row.label}
                        </TableCell>
                        {row.cells.map((cell) => (
                          <TableCell key={cell.channel} className="py-4 text-center">
                            <div className="inline-flex">
                              <ToggleSwitch
                                checked={cell.enabled}
                                disabled={patch.isPending}
                                onChange={(next) =>
                                  handleToggle(row.id, cell.channel, next)
                                }
                                ariaLabel={`${row.label} – ${t(
                                  `settings_notifications.channel.${cell.channel}`,
                                )}`}
                              />
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="sm:hidden divide-y divide-m3-outline-variant/40">
                {matrix.map((row) => (
                  <div key={row.id} className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-m3-on-surface">
                      {row.label}
                    </p>
                    <div className="space-y-2">
                      {row.cells.map((cell) => {
                        const channelLabel = t(
                          `settings_notifications.channel.${cell.channel}`,
                        );
                        return (
                          <div
                            key={cell.channel}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-m3-on-surface-variant">
                              {channelLabel}
                            </span>
                            <ToggleSwitch
                              checked={cell.enabled}
                              disabled={patch.isPending}
                              onChange={(next) =>
                                handleToggle(row.id, cell.channel, next)
                              }
                              ariaLabel={`${row.label} – ${channelLabel}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";

/**
 * Coarse "N minutes/hours/days ago" formatter, falling back to a localised
 * date past 30 days. Local to this page so its i18n keys stay page-scoped.
 */
export function useFormatRelative() {
  const { t, i18n } = useTranslation();
  const locale =
    (i18n.resolvedLanguage ?? i18n.language ?? "en") === "vi"
      ? "vi-VN"
      : "en-US";
  return (iso: string): string => {
    const now = Date.now();
    const ts = new Date(iso).getTime();
    const diff = now - ts;
    if (diff < 60_000) return t("teacher_sr_student_detail.just_now");
    const minutes = Math.round(diff / 60_000);
    if (minutes < 60)
      return t("teacher_sr_student_detail.minutes_ago", { count: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 24)
      return t("teacher_sr_student_detail.hours_ago", { count: hours });
    const days = Math.round(hours / 24);
    if (days < 30)
      return t("teacher_sr_student_detail.days_ago", { count: days });
    return new Date(iso).toLocaleDateString(locale);
  };
}

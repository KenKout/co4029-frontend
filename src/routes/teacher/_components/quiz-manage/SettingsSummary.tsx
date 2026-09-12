import { useTranslation } from "react-i18next";
import { matchPreset } from "./review-options-model";
import { hasMultipleAttempts, settingsErrors, settingsWarnings } from "./settings-insights";
import type { SettingsDraft } from "./types";

export function SettingsSummary({ draft, dirty = false }: { draft: SettingsDraft; dirty?: boolean }) {
  const { t, i18n } = useTranslation();
  const k = "teacher_quiz_manage.settings.assist";
  const preset = matchPreset(draft.review_options);
  const date = (value: string) => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString(i18n.language) : t(`${k}.not_set`);
  const rows = [
    [t("teacher_quiz_manage.settings.scoring.pass_score"), `${draft.passing_score_percent}%`],
    [t("teacher_quiz_manage.settings.scoring.time_label"), draft.time_limit_minutes ? t(`${k}.minutes`, { count: Number(draft.time_limit_minutes) }) : t(`${k}.unlimited`)],
    [t("teacher_quiz_manage.overrides.max_attempts_label"), !draft.allow_retakes ? "1" : draft.max_attempts || t(`${k}.unlimited`)],
    ...(hasMultipleAttempts(draft) ? [[t("teacher_quiz_manage.settings.scoring.grading_method_label"), t(`teacher_quiz_manage.settings.scoring.grading_method_${draft.grading_method}`)]] : []),
    [t("teacher_quiz_manage.settings.schedule.open_label"), date(draft.available_from)],
    [t("teacher_quiz_manage.settings.schedule.close_label"), date(draft.available_until)],
    [t("teacher_quiz_manage.settings.review.title"), t(`teacher_quiz_manage.settings.review.presets.${preset ?? "custom"}`)],
  ];
  return (
    <section aria-label={t(`${k}.summary`)} className="space-y-4 rounded-xl border border-border bg-m3-surface-container-lowest p-5">
      <h3 className="font-headline font-bold text-m3-on-surface">{t(`${k}.summary`)}</h3>
      <p className="text-xs text-m3-on-surface-variant">{t(`${k}.${dirty ? "draft_summary" : "saved_summary"}`)}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {rows.map(([label, value], index) => <div key={label} className={`min-w-0 space-y-1 ${index < (hasMultipleAttempts(draft) ? 4 : 3) ? "" : "col-span-2"}`}><dt className="text-m3-on-surface-variant">{label}</dt><dd className="font-semibold break-words">{value}</dd></div>)}
      </dl>
      <p className="text-xs text-m3-on-surface-variant">{t(`${k}.mastery_distinction`)}</p>
      {settingsErrors(draft).map((key) => <p key={key} role="alert" className="text-sm text-m3-error">{t(`${k}.${key}`)}</p>)}
      {settingsWarnings(draft).map((key) => <p key={key} role="status" className="text-sm text-m3-on-surface-variant border-l-2 border-m3-primary pl-3">{t(`${k}.${key}`)}</p>)}
    </section>
  );
}

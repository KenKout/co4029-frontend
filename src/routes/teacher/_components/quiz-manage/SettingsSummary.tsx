import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { detectPreset } from "../MasterySelector";
import { matchPreset } from "./review-options-model";
import {
  hasMultipleAttempts,
  settingsErrors,
  settingsWarnings,
} from "./settings-insights";
import type { SettingsDraft } from "./types";

interface SummaryRow {
  label: string;
  value: string;
  target: string;
  focus?: boolean;
}

export function navigateToQuizSetting(targetId: string, focus = true) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const section = target.matches("[data-settings-section]")
    ? target
    : target.closest<HTMLElement>("[data-settings-section]");
  const trigger = section?.querySelector<HTMLElement>(
    "[data-settings-trigger]",
  );
  if (trigger?.getAttribute("aria-expanded") === "false") trigger.click();
  window.setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (focus) target.focus({ preventScroll: true });
  }, 250);
}

function SummaryCell({
  row,
  onNavigate,
}: {
  row: SummaryRow;
  onNavigate?: (target: string, focus: boolean) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() =>
        (onNavigate ?? navigateToQuizSetting)(row.target, row.focus !== false)
      }
      className="h-auto min-w-0 justify-start whitespace-normal rounded-lg px-2 py-2 text-left hover:bg-m3-primary/5"
    >
      <span className="min-w-0 space-y-1">
        <span className="block text-xs font-normal text-m3-on-surface-variant">
          {row.label}
        </span>
        <span className="block break-words text-sm font-semibold text-m3-on-surface">
          {row.value}
        </span>
      </span>
    </Button>
  );
}

function buildSummaryRows(draft: SettingsDraft, t: TFunction) {
  const k = "teacher_quiz_manage.settings.assist";
  const reviewPreset = matchPreset(draft.review_options);
  const masteryPreset = detectPreset(draft);
  const fixedRows: SummaryRow[] = [
    {
      label: t("teacher_quiz_manage.settings.scoring.pass_score"),
      value: `${draft.passing_score_percent}%`,
      target: "quiz-setting-passing-score",
    },
    {
      label: t("teacher_quiz_manage.settings.scoring.time_label"),
      value: draft.time_limit_minutes
        ? t(`${k}.minutes`, { count: Number(draft.time_limit_minutes) })
        : t(`${k}.unlimited`),
      target: "quiz-setting-time-limit",
    },
    {
      label: t("teacher_quiz_manage.overrides.max_attempts_label"),
      value: !draft.allow_retakes
        ? "1"
        : draft.max_attempts || t(`${k}.unlimited`),
      target: draft.allow_retakes
        ? "quiz-setting-max-attempts"
        : "quiz-setting-allow-retakes",
    },
    ...(hasMultipleAttempts(draft)
      ? [
          {
            label: t(
              "teacher_quiz_manage.settings.scoring.grading_method_label",
            ),
            value: t(
              `teacher_quiz_manage.settings.scoring.grading_method_${draft.grading_method}`,
            ),
            target: "quiz-setting-grading-method",
          },
        ]
      : []),
    {
      label: t("teacher_quiz_manage.settings.attempts.allow_label"),
      value: t(`${k}.${draft.allow_retakes ? "enabled" : "disabled"}`),
      target: "quiz-setting-allow-retakes",
    },
    {
      label: t("teacher_quiz_manage.settings.review.title"),
      value: t(
        `teacher_quiz_manage.settings.review.presets.${reviewPreset ?? "custom"}`,
      ),
      target: "quiz-settings-review",
      focus: false,
    },
  ];
  const behaviorRows: SummaryRow[] = [
    [
      "shuffle_questions",
      false,
      "shuffle_q_label",
      "quiz-setting-shuffle-questions",
    ],
    [
      "shuffle_options",
      false,
      "shuffle_o_label",
      "quiz-setting-shuffle-options",
    ],
    ["show_hints", true, "show_hints_label", "quiz-setting-show-hints"],
    [
      "require_camera",
      false,
      "require_camera_label",
      "quiz-setting-require-camera",
    ],
    ["reminders_enabled", false, "reminders_label", "quiz-setting-reminders"],
  ].flatMap(([field, defaultValue, label, target]) =>
    draft[field as keyof SettingsDraft] !== defaultValue
      ? [
          {
            label: t(`teacher_quiz_manage.settings.behavior.${label}`),
            value: t(
              `${k}.${draft[field as keyof SettingsDraft] ? "enabled" : "disabled"}`,
            ),
            target: String(target),
          },
        ]
      : [],
  );
  const dynamicRows: SummaryRow[] = [
    ...behaviorRows,
    {
      label: t(`${k}.mastery_mode`),
      value:
        masteryPreset === "custom"
          ? t(`${k}.custom`)
          : t(
              `teacher_quiz_manage.settings.spacing.presets.${masteryPreset}.name`,
            ),
      target: "quiz-settings-mastery",
      focus: false,
    },
    ...(draft.require_password.trim()
      ? [
          {
            label: t("teacher_quiz_manage.settings.access.password_label"),
            value: t(`${k}.password_set`),
            target: "quiz-setting-password",
          },
        ]
      : []),
  ];
  return { fixedRows, dynamicRows };
}

export function SettingsSummary({
  draft,
  dirty = false,
  onNavigate,
}: {
  draft: SettingsDraft;
  dirty?: boolean;
  onNavigate?: (target: string, focus: boolean) => void;
}) {
  const { t, i18n } = useTranslation();
  const k = "teacher_quiz_manage.settings.assist";
  const { fixedRows, dynamicRows } = buildSummaryRows(draft, t);
  const date = (value: string) =>
    value && Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleString(i18n.language)
      : t(`${k}.not_set`);
  return (
    <section
      aria-label={t(`${k}.summary`)}
      className="space-y-4 rounded-xl border border-border bg-m3-surface-container-lowest p-5"
    >
      <h3 className="font-headline font-bold text-m3-on-surface">
        {t(`${k}.summary`)}
      </h3>
      <p className="text-xs text-m3-on-surface-variant">
        {t(`${k}.${dirty ? "draft_summary" : "saved_summary"}`)}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {fixedRows.map((row) => (
          <SummaryCell
            key={row.target + row.label}
            row={row}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      {(draft.available_from || draft.available_until) && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-m3-outline-variant/20 p-1">
          <SummaryCell
            row={{
              label: t("teacher_quiz_manage.settings.schedule.open_label"),
              value: date(draft.available_from),
              target: "quiz-setting-available-from",
            }}
            onNavigate={onNavigate}
          />
          <SummaryCell
            row={{
              label: t("teacher_quiz_manage.settings.schedule.close_label"),
              value: date(draft.available_until),
              target: "quiz-setting-available-until",
            }}
            onNavigate={onNavigate}
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-1 border-t border-m3-outline-variant/20 pt-2 sm:grid-cols-2">
        {dynamicRows.map((row) => (
          <SummaryCell key={row.target} row={row} onNavigate={onNavigate} />
        ))}
      </div>
      <p className="text-xs text-m3-on-surface-variant">
        {t(`${k}.mastery_distinction`)}
      </p>
      {settingsErrors(draft).map((key) => (
        <p key={key} role="alert" className="text-sm text-m3-error">
          {t(`${k}.${key}`)}
        </p>
      ))}
      {settingsWarnings(draft).map((key) => (
        <p
          key={key}
          role="status"
          className="border-l-2 border-m3-primary pl-3 text-sm text-m3-on-surface-variant"
        >
          {t(`${k}.${key}`)}
        </p>
      ))}
    </section>
  );
}

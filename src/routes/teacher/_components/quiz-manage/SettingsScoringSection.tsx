import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, LockableSection, SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";
import { hasMultipleAttempts } from "./settings-insights";

/**
 * Scoring section: passing score, time limit, headline-grade policy. Frozen
 * once the quiz is published. Extracted from SettingsTab verbatim.
 */
export function SettingsScoringSection({
  draft,
  update,
  locked,
}: {
  draft: SettingsDraft;
  update: SettingsUpdate;
  locked: boolean;
}) {
  const { t } = useTranslation();

  return (
    <LockableSection locked={locked}>
      <SettingsSection title={t("teacher_quiz_manage.settings.scoring.title")}>
        <Field
          label={
            <span className="flex items-center justify-between">
              <span>
                {t("teacher_quiz_manage.settings.scoring.pass_score")}
              </span>
              <span className="text-m3-primary font-extrabold text-sm">
                {Number.isFinite(draft.passing_score_percent) ? `${draft.passing_score_percent}%` : "—"}
              </span>
            </span>
          }
        >
          <input
            aria-label={t("teacher_quiz_manage.settings.scoring.pass_score")}
            type="range"
            min={0}
            max={100}
            step={5}
            value={Number.isFinite(draft.passing_score_percent) ? draft.passing_score_percent : 0}
            onChange={(e) =>
              update("passing_score_percent", Number(e.target.value))
            }
            className="w-full h-2 rounded-full cursor-pointer accent-[var(--m3-primary)]"
          />
          <Input
            aria-label={t("teacher_quiz_manage.settings.assist.precise_score")}
            type="number" min={0} max={100} step={0.01} required
            value={Number.isFinite(draft.passing_score_percent) ? draft.passing_score_percent : ""}
            onChange={(e) => update("passing_score_percent", e.target.valueAsNumber)}
            endAdornment="%"
          />
        </Field>
        {hasMultipleAttempts(draft) ? <Field
          label={t("teacher_quiz_manage.settings.scoring.grading_method_label")}
          hint={t("teacher_quiz_manage.settings.scoring.grading_method_hint")}
        >
          <Select<SettingsDraft["grading_method"]>
            value={draft.grading_method}
            onValueChange={(next) => update("grading_method", next)}
            options={[
              {
                value: "highest",
                label: t(
                  "teacher_quiz_manage.settings.scoring.grading_method_highest",
                ),
              },
              {
                value: "average",
                label: t(
                  "teacher_quiz_manage.settings.scoring.grading_method_average",
                ),
              },
              {
                value: "first",
                label: t(
                  "teacher_quiz_manage.settings.scoring.grading_method_first",
                ),
              },
              {
                value: "last",
                label: t(
                  "teacher_quiz_manage.settings.scoring.grading_method_last",
                ),
              },
            ]}
            className="w-full"
          />
        </Field> : <p className="text-xs text-m3-on-surface-variant">{t("teacher_quiz_manage.settings.assist.single_attempt_grading")}</p>}
      </SettingsSection>
    </LockableSection>
  );
}

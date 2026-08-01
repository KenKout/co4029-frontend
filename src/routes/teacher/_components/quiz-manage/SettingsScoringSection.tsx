import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field, LockableSection, SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

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
                {draft.passing_score_percent}%
              </span>
            </span>
          }
        >
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={draft.passing_score_percent}
            onChange={(e) =>
              update("passing_score_percent", Number(e.target.value))
            }
            className="w-full h-2 rounded-full cursor-pointer accent-[var(--m3-primary)]"
          />
        </Field>
        <Field
          label={t("teacher_quiz_manage.settings.scoring.time_label")}
          hint={t("teacher_quiz_manage.settings.scoring.time_hint")}
        >
          <Input
            type="number"
            min={1}
            max={180}
            value={draft.time_limit_minutes}
            onChange={(e) => update("time_limit_minutes", e.target.value)}
            placeholder={t(
              "teacher_quiz_manage.settings.scoring.time_placeholder",
            )}
            className="w-40"
          />
        </Field>
        <Field
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
            className="w-full sm:w-72"
          />
        </Field>
      </SettingsSection>
    </LockableSection>
  );
}

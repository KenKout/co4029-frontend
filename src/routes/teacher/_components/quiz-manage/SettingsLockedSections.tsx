import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";

import { MasterySelector } from "../MasterySelector";
import { FeedbackBandsPanel } from "./FeedbackBandsPanel";
import { OverridesPanel } from "./OverridesPanel";
import { ReviewOptionsMatrix } from "./ReviewOptionsMatrix";
import { SettingsAccessSection } from "./SettingsAccessSection";
import { SettingsTimingSection } from "./SettingsTimingSection";
import { LockableSection, SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/**
 * Review visibility, access/proctoring, overdue timing, overrides, feedback
 * bands, and SM-2 spacing all change how the quiz is graded or presented under
 * a live/finished attempt — frozen once published. Extracted from SettingsTab
 * verbatim, wrapper and all, so the single `<fieldset disabled>` that covers
 * the whole group is unchanged.
 */
export function SettingsLockedSections({
  quizId,
  draft,
  update,
  setDraft,
  locked,
}: {
  quizId: string;
  draft: SettingsDraft;
  update: SettingsUpdate;
  setDraft: Dispatch<SetStateAction<SettingsDraft | null>>;
  locked: boolean;
}) {
  const { t } = useTranslation();

  return (
    <LockableSection locked={locked}>
      <div className="space-y-8">
        <SettingsSection
          title={t("teacher_quiz_manage.settings.review.title")}
          description={t("teacher_quiz_manage.settings.review.description")}
        >
          <ReviewOptionsMatrix
            value={draft.review_options}
            onChange={(next) => update("review_options", next)}
          />
        </SettingsSection>

        <SettingsAccessSection draft={draft} update={update} />

        <SettingsTimingSection draft={draft} update={update} />

        <SettingsSection
          title={t("teacher_quiz_manage.settings.overrides.title")}
          description={t("teacher_quiz_manage.settings.overrides.description")}
        >
          <OverridesPanel quizId={quizId} />
        </SettingsSection>

        <SettingsSection
          title={t("teacher_quiz_manage.settings.feedback.title")}
          description={t("teacher_quiz_manage.settings.feedback.description")}
        >
          <FeedbackBandsPanel quizId={quizId} />
        </SettingsSection>

        <SettingsSection
          title={t("teacher_quiz_manage.settings.spacing.title")}
          description={t("teacher_quiz_manage.settings.spacing.description")}
        >
          <MasterySelector
            values={{
              initial_ef: draft.initial_ef,
              min_ef_for_unlock: draft.min_ef_for_unlock,
              coverage_threshold: draft.coverage_threshold,
            }}
            onPatch={(patch) =>
              setDraft((current) =>
                current ? { ...current, ...patch } : current,
              )
            }
          />
        </SettingsSection>
      </div>
    </LockableSection>
  );
}

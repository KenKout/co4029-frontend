import { memo, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { MasterySelector } from "../MasterySelector";
import { ReviewOptionsMatrix } from "./ReviewOptionsMatrix";
import { SettingsAccessSection } from "./SettingsAccessSection";
import { SettingsSection } from "./form-primitives";
import type { SettingsDraft, SettingsUpdate } from "./types";

/** Freeze mutation controls, never the disclosures needed to inspect them. */
function SettingsLockedSectionsComponent({
  draft,
  update,
  setDraft,
  locked,
}: {
  draft: SettingsDraft;
  update: SettingsUpdate;
  setDraft: Dispatch<SetStateAction<SettingsDraft | null>>;
  locked: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Card>
        <CardContent>
          <SettingsSection
            id="quiz-settings-review"
            title={t("teacher_quiz_manage.settings.review.title")}
            description={t("teacher_quiz_manage.settings.review.description")}
          >
            <ReviewOptionsMatrix
              value={draft.review_options}
              disabled={locked}
              onChange={(next) => update("review_options", next)}
            />
          </SettingsSection>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <SettingsSection
            id="quiz-settings-mastery"
            title={t("teacher_quiz_manage.settings.spacing.title")}
            description={t("teacher_quiz_manage.settings.spacing.description")}
          >
            <MasterySelector
              disabled={locked}
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
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <SettingsAccessSection
            draft={draft}
            update={update}
            locked={locked}
          />
        </CardContent>
      </Card>
    </>
  );
}

export const SettingsLockedSections = memo(
  SettingsLockedSectionsComponent,
  (previous, next) =>
    previous.update === next.update &&
    previous.setDraft === next.setDraft &&
    previous.locked === next.locked &&
    previous.draft.review_options === next.draft.review_options &&
    previous.draft.initial_ef === next.draft.initial_ef &&
    previous.draft.min_ef_for_unlock === next.draft.min_ef_for_unlock &&
    previous.draft.coverage_threshold === next.draft.coverage_threshold &&
    previous.draft.require_password === next.draft.require_password &&
    previous.draft.require_subnet === next.draft.require_subnet &&
    previous.draft.integrity_weight_tab_switch ===
      next.draft.integrity_weight_tab_switch &&
    previous.draft.integrity_weight_focus_lost ===
      next.draft.integrity_weight_focus_lost &&
    previous.draft.integrity_weight_fullscreen_exit ===
      next.draft.integrity_weight_fullscreen_exit &&
    previous.draft.integrity_score_threshold ===
      next.draft.integrity_score_threshold,
);

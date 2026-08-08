import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";

import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CourseLearningOutcomeAuthoring } from "@/lib/api/types";
import type { QuestionDraft } from "./types";

/**
 * The authoring body of a QuestionCard: prompt stem, learning-outcome link and
 * optional hint. Extracted from QuestionCard verbatim — the three blocks stay
 * sibling children of the card so the `space-y-3` rhythm is unchanged.
 */
export function QuestionCardBody({
  draft,
  setDraft,
  outcomes,
}: {
  draft: QuestionDraft;
  setDraft: Dispatch<SetStateAction<QuestionDraft>>;
  outcomes: CourseLearningOutcomeAuthoring[];
}) {
  const { t } = useTranslation();

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.editor.prompt_label")}
        </label>
        <Textarea
          value={draft.prompt_text}
          onChange={(e) =>
            setDraft((current) => ({ ...current, prompt_text: e.target.value }))
          }
          rows={3}
          variant="lowest"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.outcome.label", "Learning outcome")}
        </label>
        <Select<string>
          value={draft.learning_outcome_id ?? ""}
          onValueChange={(next) =>
            setDraft((current) => ({
              ...current,
              learning_outcome_id: next || null,
            }))
          }
          options={[
            {
              value: "",
              label: t("teacher_quiz_manage.outcome.none", "No outcome"),
            },
            ...outcomes.map((outcome) => ({
              value: outcome.id,
              label: `${"\u00A0".repeat((outcome.depth ?? 0) * 2)}L.O.${
                outcome.code ?? outcome.position
              } — ${
                outcome.outcome_text.length > 60
                  ? `${outcome.outcome_text.slice(0, 60)}…`
                  : outcome.outcome_text
              }`,
            })),
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.hint_label",
            "Hint (shown to learner on request)",
          )}
        </label>
        <Textarea
          value={draft.hint_text}
          onChange={(e) =>
            setDraft((current) => ({ ...current, hint_text: e.target.value }))
          }
          rows={2}
          variant="lowest"
          placeholder={t(
            "teacher_quiz_manage.editor.hint_placeholder",
            "e.g. Think about which property distinguishes analytical storage from transactional storage.",
          )}
        />
        <p className="text-[11px] text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.hint_help",
            'Optional. Only shown to learners if "Show hints" is enabled in Quiz Settings. Must not reveal the answer.',
          )}
        </p>
      </div>
    </>
  );
}

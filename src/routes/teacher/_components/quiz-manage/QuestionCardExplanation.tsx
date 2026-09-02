import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { QuestionDraft } from "./types";

/**
 * Why the correct answer is correct — shown to the learner after they answer.
 *
 * Split out of the former QuestionCardConfig, which paired it with the
 * difficulty / expected-time block. That pairing was the odd one: the
 * explanation is content the learner reads, the other two are settings, and
 * bundling them meant the settings inherited the content column's full width
 * while the explanation inherited the settings' visual weight. The settings
 * now live in {@link QuestionCardMetaRail}; the explanation stays here, under
 * the options it explains.
 */
export function QuestionCardExplanation({
  draft,
  setDraft,
}: {
  draft: QuestionDraft;
  setDraft: Dispatch<SetStateAction<QuestionDraft>>;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_quiz_manage.editor.explanation_label")}
      </label>
      <Textarea
        value={draft.explanation}
        onChange={(e) =>
          setDraft((current) => ({ ...current, explanation: e.target.value }))
        }
        rows={2}
        autoGrow
        variant="lowest"
      />
    </div>
  );
}

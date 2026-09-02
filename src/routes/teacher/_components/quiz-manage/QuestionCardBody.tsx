import { useTranslation } from "react-i18next";
import type { Dispatch, SetStateAction } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { QuestionDraft } from "./types";

/**
 * The question stem — the one field on the card that is the question.
 *
 * This used to carry the learning-outcome select and the hint as well. Those
 * moved to {@link QuestionCardMetaRail}: measured on a real five-question
 * quiz, hint + outcome + configuration came to 280px of a 907px card (31%),
 * stacked in the same single column as the question itself and pushing the
 * options below the fold. They are reference and settings, not content, so
 * they now run alongside in a rail instead of in front of the answers.
 *
 * `autoGrow` replaces the old `rows={3}`: a one-line question was sitting in
 * an 88px box, and every card was exactly 907px tall no matter how long its
 * question actually was.
 */
export function QuestionCardBody({
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
        {t("teacher_quiz_manage.editor.prompt_label")}
      </label>
      <Textarea
        value={draft.prompt_text}
        onChange={(e) =>
          setDraft((current) => ({ ...current, prompt_text: e.target.value }))
        }
        rows={2}
        autoGrow
        variant="lowest"
      />
    </div>
  );
}

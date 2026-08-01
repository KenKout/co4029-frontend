import { useTranslation } from "react-i18next";

import { Select } from "@/components/ui/select";
import type {
  InterviewDifficulty,
  InterviewQuestionType,
} from "@/lib/api/types";
import { DIFFICULTIES, QUESTION_TYPES } from "./constants";
import type { EditorState } from "./types";

/**
 * The editor's two classification pickers — question type and difficulty —
 * extracted verbatim from the former 843-line course-question-bank.tsx.
 */
export function EditorClassificationFields({
  draft,
  setDraft,
}: {
  draft: EditorState;
  setDraft: (next: EditorState) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_question_bank.filter_type")}
        </label>
        <Select<InterviewQuestionType>
          value={draft.question_type}
          onValueChange={(next) =>
            setDraft({
              ...draft,
              question_type: next,
            })
          }
          options={QUESTION_TYPES.map((qt) => ({
            value: qt,
            label: t(`teacher_interview_config.qbank.type.${qt}`),
          }))}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_question_bank.filter_difficulty")}
        </label>
        <Select<InterviewDifficulty | "none">
          value={draft.difficulty}
          onValueChange={(next) =>
            setDraft({
              ...draft,
              difficulty: next,
            })
          }
          options={[
            {
              value: "none",
              label: t("teacher_question_bank.no_difficulty"),
            },
            ...DIFFICULTIES.map((d) => ({
              value: d,
              label: t(`teacher_interview_config.qbank.difficulty.${d}`),
            })),
          ]}
        />
      </div>
    </div>
  );
}

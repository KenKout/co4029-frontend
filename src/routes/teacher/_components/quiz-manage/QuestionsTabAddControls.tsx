import { useTranslation } from "react-i18next";
import { Loader2, Plus } from "lucide-react";

import { Select } from "@/components/ui/select";

/**
 * Add-question controls: the primary multiple-choice button plus the type
 * picker for every other supported shape. Extracted from QuestionsTab verbatim;
 * the tab still owns the `!published` gate, because a frozen quiz hides these
 * entirely so no new questions can be seeded.
 */
export function QuestionsTabAddControls({
  onAddQuestion,
  addPending,
}: {
  onAddQuestion: (questionType?: string) => void | Promise<void>;
  addPending: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <button
        type="button"
        onClick={() => onAddQuestion("multiple_choice")}
        disabled={addPending}
        className="flex-1 min-w-[12rem] flex items-center justify-center gap-2 border-2 border-dashed border-m3-outline-variant/40 rounded-xl px-6 py-4 text-sm font-bold text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary hover:bg-m3-primary/5 transition-all disabled:opacity-60 cursor-pointer"
      >
        {addPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {t("teacher_quiz_manage.actions.add_question")}
      </button>
      {/* Phase 7: type picker — add a question of any supported type.
        Selecting a value seeds the right shape; the reset to "" keeps
        this a pure action control (not stateful). */}
      <Select<string>
        aria-label={t("teacher_quiz_manage.actions.add_question_of_type")}
        disabled={addPending}
        value=""
        onValueChange={(next) => {
          if (next) void onAddQuestion(next);
        }}
        options={[
          {
            value: "",
            label: t("teacher_quiz_manage.actions.add_other_type"),
          },
          {
            value: "true_false",
            label: t("teacher_quiz_manage.type_editor.type_true_false"),
          },
          {
            value: "short_answer",
            label: t("teacher_quiz_manage.type_editor.type_short_answer"),
          },
          {
            value: "numerical",
            label: t("teacher_quiz_manage.type_editor.type_numerical"),
          },
          {
            value: "matching",
            label: t("teacher_quiz_manage.type_editor.type_matching"),
          },
          {
            value: "ordering",
            label: t("teacher_quiz_manage.type_editor.type_ordering"),
          },
        ]}
        className="w-auto shrink-0 border-dashed py-4 font-bold"
      />
    </div>
  );
}

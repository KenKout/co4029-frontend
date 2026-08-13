import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The fill_blank distractor editor: the non-correct word-bank entries the
 * student can drop into a blank but which are never the answer. Editable like
 * the matching distractors — add/remove/rename rows. The correct answers come
 * from the "Blanks (in stem order)" editor above; this list is everything else
 * that shows in the student's word bank.
 */
export function QuestionCardFillBlankDistractors({
  distractors,
  disabled,
  onChange,
}: {
  distractors: string[];
  disabled?: boolean;
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-4 space-y-2 border-t border-m3-outline-variant/20 pt-4">
      <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_quiz_manage.editor.fill_blank_distractors_label")}
      </label>
      {distractors.map((distractor, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-center text-m3-on-surface-variant">
            ✗
          </span>
          <input
            type="text"
            value={distractor}
            disabled={disabled}
            placeholder={t(
              "teacher_quiz_manage.editor.fill_blank_distractor_placeholder",
            )}
            onChange={(e) => {
              const next = distractors.map((d, i) =>
                i === idx ? e.target.value : d,
              );
              onChange(next);
            }}
            className="flex-1 rounded-lg border-2 border-amber-300 bg-amber-50/50 px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary"
          />
          <Button
            variant="ghost"
            type="button"
            disabled={disabled}
            onClick={() => onChange(distractors.filter((_, i) => i !== idx))}
            aria-label={t("teacher_quiz_manage.type_editor.remove_distractor")}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 h-auto whitespace-normal"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="link"
        type="button"
        disabled={disabled}
        onClick={() => onChange([...distractors, ""])}
        className="flex items-center gap-1.5 text-sm text-m3-primary font-medium hover:underline disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        {t("teacher_quiz_manage.type_editor.add_distractor")}
      </Button>
      <p className="text-[11px] text-m3-on-surface-variant">
        {t("teacher_quiz_manage.editor.fill_blank_distractors_hint")}
      </p>
    </div>
  );
}

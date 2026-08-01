import { useTranslation } from "react-i18next";

import type { TypeSpecificEditorProps } from "./type-specific-value";

/**
 * ``numerical`` → answer + tolerance number inputs. Extracted from
 * TypeSpecificAnswerEditor verbatim.
 */
export function TypeSpecificNumericalEditor({
  value,
  disabled,
  onChange,
}: TypeSpecificEditorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_quiz_manage.type_editor.numerical_label")}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_quiz_manage.type_editor.numeric_answer")}
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={value.numeric_answer}
            disabled={disabled}
            onChange={(e) => onChange({ numeric_answer: e.target.value })}
            className="w-full rounded-lg border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary tabular-nums"
          />
        </div>
        <div>
          <span className="text-[11px] text-m3-on-surface-variant">
            {t("teacher_quiz_manage.type_editor.numeric_tolerance")}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={value.numeric_tolerance}
            disabled={disabled}
            onChange={(e) => onChange({ numeric_tolerance: e.target.value })}
            className="w-full rounded-lg border-2 border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary tabular-nums"
          />
        </div>
      </div>
      <p className="text-[11px] text-m3-on-surface-variant">
        {t("teacher_quiz_manage.type_editor.numeric_hint")}
      </p>
    </div>
  );
}

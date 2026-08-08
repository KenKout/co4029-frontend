import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";

import type { TypeSpecificEditorProps } from "./type-specific-value";
import { Button } from "@/components/ui/button";

/**
 * ``matching`` → list of {left,right} pairs (add/remove rows). Extracted from
 * TypeSpecificAnswerEditor verbatim.
 */
export function TypeSpecificMatchingEditor({
  value,
  disabled,
  onChange,
}: TypeSpecificEditorProps) {
  const { t } = useTranslation();
  const pairs = value.match_pairs;
  const distractors = value.match_distractors;

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_quiz_manage.type_editor.matching_label")}
      </label>
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={pair.left}
            disabled={disabled}
            placeholder={t("teacher_quiz_manage.type_editor.match_left")}
            onChange={(e) => {
              const next = pairs.map((p, i) =>
                i === idx ? { ...p, left: e.target.value } : p,
              );
              onChange({ match_pairs: next });
            }}
            className="flex-1 rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary"
          />
          <span className="text-m3-on-surface-variant">→</span>
          <input
            type="text"
            value={pair.right}
            disabled={disabled}
            placeholder={t("teacher_quiz_manage.type_editor.match_right")}
            onChange={(e) => {
              const next = pairs.map((p, i) =>
                i === idx ? { ...p, right: e.target.value } : p,
              );
              onChange({ match_pairs: next });
            }}
            className="flex-1 rounded-lg border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary"
          />
          <Button variant="ghost"
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange({ match_pairs: pairs.filter((_, i) => i !== idx) })
            }
            aria-label={t("teacher_quiz_manage.type_editor.remove_pair")}
            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 h-auto whitespace-normal"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="link"
        type="button"
        disabled={disabled}
        onClick={() =>
          onChange({ match_pairs: [...pairs, { left: "", right: "" }] })
        }
        className="flex items-center gap-1.5 text-sm text-m3-primary font-medium hover:underline disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        {t("teacher_quiz_manage.type_editor.add_pair")}
      </Button>
      <p className="text-[11px] text-m3-on-surface-variant">
        {t("teacher_quiz_manage.type_editor.matching_hint")}
      </p>

      {/* Distractors: extra unpaired right-side choices. They join the shuffled
          choice pool but are never a correct answer, so the last prompt isn't a
          forced pick and elimination is harder. Optional — no rows = 1:1. */}
      <div className="mt-4 space-y-2 border-t border-m3-outline-variant/20 pt-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.type_editor.distractors_label")}
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
              placeholder={t("teacher_quiz_manage.type_editor.distractor_placeholder")}
              onChange={(e) => {
                const next = distractors.map((d, i) =>
                  i === idx ? e.target.value : d,
                );
                onChange({ match_distractors: next });
              }}
              className="flex-1 rounded-lg border-2 border-amber-300 bg-amber-50/50 px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary"
            />
            <Button variant="ghost"
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({
                  match_distractors: distractors.filter((_, i) => i !== idx),
                })
              }
              aria-label={t("teacher_quiz_manage.type_editor.remove_distractor")}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40 h-auto whitespace-normal"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="link"
          type="button"
          disabled={disabled}
          onClick={() => onChange({ match_distractors: [...distractors, ""] })}
          className="flex items-center gap-1.5 text-sm text-m3-primary font-medium hover:underline disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          {t("teacher_quiz_manage.type_editor.add_distractor")}
        </Button>
        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_quiz_manage.type_editor.distractors_hint")}
        </p>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Phase 7 — teacher answer editor for the expanded question types. Renders the
 * right editor for the given ``questionType``:
 *
 * - ``numerical``  → answer + tolerance number inputs.
 * - ``matching``   → list of {left,right} pairs (add/remove rows).
 * - ``ordering``   → ordered list of items (add/remove/reorder); the stored
 *   order IS the correct sequence (students see it shuffled).
 * - ``multiple_choice`` → single-answer toggle (radio vs checkbox). Option
 *   editing stays in the parent (it owns the option rows).
 *
 * Self-contained (value + onChange per field) so it drops into QuestionCard
 * without bloating quiz-manage.tsx. All values are strings/arrays that map
 * directly to the authoring PATCH payload.
 */
export interface TypeSpecificValue {
  single_answer: boolean;
  numeric_answer: string;
  numeric_tolerance: string;
  match_pairs: Array<{ left: string; right: string }>;
  ordering_sequence: string[];
}

export function TypeSpecificAnswerEditor({
  questionType,
  value,
  disabled,
  onChange,
}: {
  questionType: string;
  value: TypeSpecificValue;
  disabled?: boolean;
  onChange: (patch: Partial<TypeSpecificValue>) => void;
}) {
  const { t } = useTranslation();

  if (questionType === "numerical") {
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

  if (questionType === "matching") {
    const pairs = value.match_pairs;
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
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({ match_pairs: pairs.filter((_, i) => i !== idx) })
              }
              aria-label={t("teacher_quiz_manage.type_editor.remove_pair")}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange({ match_pairs: [...pairs, { left: "", right: "" }] })
          }
          className="flex items-center gap-1.5 text-sm text-m3-primary font-medium hover:underline disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          {t("teacher_quiz_manage.type_editor.add_pair")}
        </button>
        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_quiz_manage.type_editor.matching_hint")}
        </p>
      </div>
    );
  }

  if (questionType === "ordering") {
    const items = value.ordering_sequence;
    function move(index: number, dir: -1 | 1) {
      const target = index + dir;
      if (target < 0 || target >= items.length) return;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      onChange({ ordering_sequence: next });
    }
    return (
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.type_editor.ordering_label")}
        </label>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded bg-m3-primary/10 text-m3-primary font-bold text-xs tabular-nums">
              {idx + 1}
            </span>
            <input
              type="text"
              value={item}
              disabled={disabled}
              onChange={(e) => {
                const next = items.map((s, i) =>
                  i === idx ? e.target.value : s,
                );
                onChange({ ordering_sequence: next });
              }}
              className="flex-1 rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:border-m3-primary"
            />
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                disabled={disabled || idx === 0}
                onClick={() => move(idx, -1)}
                aria-label={t("teacher_quiz_manage.type_editor.move_up")}
                className="px-1.5 rounded bg-m3-surface-container-high hover:bg-m3-primary hover:text-white disabled:opacity-30 text-xs leading-tight"
              >
                ▲
              </button>
              <button
                type="button"
                disabled={disabled || idx === items.length - 1}
                onClick={() => move(idx, 1)}
                aria-label={t("teacher_quiz_manage.type_editor.move_down")}
                className="px-1.5 rounded bg-m3-surface-container-high hover:bg-m3-primary hover:text-white disabled:opacity-30 text-xs leading-tight"
              >
                ▼
              </button>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ordering_sequence: items.filter((_, i) => i !== idx),
                })
              }
              aria-label={t("teacher_quiz_manage.type_editor.remove_item")}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ordering_sequence: [...items, ""] })}
          className="flex items-center gap-1.5 text-sm text-m3-primary font-medium hover:underline disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          {t("teacher_quiz_manage.type_editor.add_item")}
        </button>
        <p className="text-[11px] text-m3-on-surface-variant">
          {t("teacher_quiz_manage.type_editor.ordering_hint")}
        </p>
      </div>
    );
  }

  if (questionType === "multiple_choice") {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ single_answer: !value.single_answer })}
          aria-pressed={!value.single_answer}
          className={cn(
            "relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-40",
            !value.single_answer
              ? "bg-m3-primary"
              : "bg-m3-surface-container-high",
          )}
        >
          <span
            className={cn(
              "absolute top-1 w-4 h-4 rounded-full transition-all",
              !value.single_answer ? "left-6 bg-white" : "left-1 bg-slate-400",
            )}
          />
        </button>
        <div>
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_quiz_manage.type_editor.multi_select_label")}
          </p>
          <p className="text-xs text-m3-on-surface-variant">
            {t("teacher_quiz_manage.type_editor.multi_select_desc")}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

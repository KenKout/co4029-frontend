import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";

import type { TypeSpecificEditorProps } from "./type-specific-value";

/**
 * ``ordering`` → ordered list of items (add/remove/reorder); the stored order IS
 * the correct sequence (students see it shuffled). Extracted from
 * TypeSpecificAnswerEditor verbatim.
 */
export function TypeSpecificOrderingEditor({
  value,
  disabled,
  onChange,
}: TypeSpecificEditorProps) {
  const { t } = useTranslation();
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

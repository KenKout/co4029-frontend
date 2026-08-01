import { useTranslation } from "react-i18next";

import type { ReviewOptions } from "@/lib/api/hooks/quizzes";
import { cn } from "@/lib/utils";
import { PRESETS, PRESET_KEYS } from "./review-options-model";
import type { PresetKey } from "./review-options-model";

/**
 * Presets: one click for the common cases. Extracted from ReviewOptionsMatrix
 * verbatim.
 */
export function ReviewPresetRow({
  activePreset,
  onChange,
}: {
  activePreset: PresetKey | null;
  onChange: (next: ReviewOptions) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_quiz_manage.settings.review.presets_label")}
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESET_KEYS.map((key) => {
          const active = activePreset === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(PRESETS[key]())}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-m3-primary bg-m3-primary/10 text-m3-primary"
                  : "border-m3-outline-variant/40 text-m3-on-surface-variant hover:bg-m3-surface-container-high",
              )}
            >
              {t(`teacher_quiz_manage.settings.review.presets.${key}`)}
            </button>
          );
        })}
        {activePreset === null && (
          <span className="self-center rounded-full bg-m3-surface-container-high px-3 py-1.5 text-xs font-semibold text-m3-on-surface-variant">
            {t("teacher_quiz_manage.settings.review.presets.custom")}
          </span>
        )}
      </div>
    </div>
  );
}

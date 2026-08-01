import { useTranslation } from "react-i18next";

/**
 * Edge-kind legend plus the interaction hint, pinned to the canvas' bottom-left
 * corner. Extracted verbatim from the former 863-line
 * knowledge-graph-detail.tsx.
 */
export function KgLegend() {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 space-y-1.5 rounded-xl border border-m3-outline-variant/20 bg-m3-surface/90 px-3 py-2 text-[11px] text-m3-on-surface-variant shadow-sm backdrop-blur">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-5 border-t border-dashed border-amber-600" />
        {t("teacher_lesson_materials.kg.legend_prereq")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-5 border-t border-m3-outline-variant" />
        {t("teacher_lesson_materials.kg.legend_related")}
      </span>
      <span className="block pt-0.5 text-[10px] italic opacity-80">
        {t("teacher_lesson_materials.kg.detail_hint")}
      </span>
    </div>
  );
}

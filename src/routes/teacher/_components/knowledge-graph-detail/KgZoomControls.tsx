import { Minus, Plus, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Floating zoom-in / zoom-out / fit-to-view cluster in the canvas' bottom-right
 * corner. Extracted verbatim from the former 863-line
 * knowledge-graph-detail.tsx.
 */
export function KgZoomControls({
  onZoomIn,
  onZoomOut,
  onFitToView,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 rounded-xl border border-m3-outline-variant/20 bg-m3-surface/95 p-1.5 shadow-glass backdrop-blur">
      <button
        type="button"
        onClick={onZoomIn}
        aria-label={t("teacher_lesson_materials.kg.zoom_in")}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        aria-label={t("teacher_lesson_materials.kg.zoom_out")}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onFitToView}
        aria-label={t("teacher_lesson_materials.kg.fit_view")}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  );
}

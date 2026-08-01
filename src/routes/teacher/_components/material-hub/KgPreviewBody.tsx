import { useTranslation } from "react-i18next";

import { KgPreviewCanvas } from "./KgPreviewCanvas";
import { KgPreviewLegend } from "./KgPreviewLegend";
import type { KgPreviewController } from "./use-kg-preview";

/**
 * The preview's four display states: loading skeleton, KG-disabled hint, empty
 * hint, and the graph itself. Extracted verbatim from the former 1422-line
 * material-hub.tsx.
 */
export function KgPreviewBody({
  kg,
  readyCount,
}: {
  kg: KgPreviewController;
  readyCount: number;
}) {
  const { t } = useTranslation();
  const { isLoading, data, nodes } = kg;

  return isLoading ? (
    <div className="h-[240px] rounded-xl bg-m3-surface-container-low animate-pulse" />
  ) : data?.enabled === false ? (
    <p className="text-xs text-m3-on-surface-variant font-medium text-center py-16">
      {t("teacher_lesson_materials.kg.disabled_hint")}
    </p>
  ) : nodes.length === 0 ? (
    <p className="text-xs text-m3-on-surface-variant font-medium text-center py-16">
      {readyCount > 0
        ? t("teacher_lesson_materials.kg.empty_hint")
        : t("teacher_lesson_materials.kg.awaiting_hint")}
    </p>
  ) : (
    <>
      <KgPreviewCanvas kg={kg} />

      {/* Legend + count */}
      <KgPreviewLegend data={data} nodes={nodes} />
    </>
  );
}

import { useTranslation } from "react-i18next";

import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

/**
 * Relation legend plus the "showing top N of M" tally. Extracted verbatim from
 * the former 1422-line material-hub.tsx.
 */
export function KgPreviewLegend({
  data,
  nodes,
}: {
  data: LessonKnowledgeGraph | undefined;
  nodes: LessonKnowledgeGraph["nodes"];
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] text-m3-on-surface-variant">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t border-dashed border-amber-600" />
          {t("teacher_lesson_materials.kg.legend_prereq")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t border-m3-outline-variant" />
          {t("teacher_lesson_materials.kg.legend_related")}
        </span>
      </div>
      {data && data.total_concepts > nodes.length && (
        <span className="font-medium">
          {t("teacher_lesson_materials.kg.showing_top", {
            shown: nodes.length,
            total: data.total_concepts,
          })}
        </span>
      )}
    </div>
  );
}

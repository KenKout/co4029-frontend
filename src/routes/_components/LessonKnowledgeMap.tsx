import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, Maximize2 } from "lucide-react";

import { usePublishedLessonKnowledgeGraph } from "@/lib/api/hooks/materials";
import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";
import { KnowledgeGraphDetail } from "@/routes/teacher/_components/knowledge-graph-detail";

/**
 * Teacher-published knowledge map on the student reading view.
 *
 * Renders the SAME explorer the teacher uses (`KnowledgeGraphDetail`) so the two
 * roles see an identical graph — same tree/circular layouts, zoom/pan, node
 * inspector, relation legend and keyboard handling — instead of the separate,
 * thinner radial renderer this file used to carry. Keeping one viewer means a
 * layout or interaction fix lands for both roles at once.
 *
 * Authoring affordances are simply omitted: `KnowledgeGraphDetail` hides the
 * AI/Curated source toggle when `onSourceChange` is absent and the Edit button
 * when `onEdit` is absent, so students get a read-only view with no extra
 * gating logic here.
 *
 * Renders nothing at all until a teacher has published a graph for the lesson.
 */
export function LessonKnowledgeMap({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const { data } = usePublishedLessonKnowledgeGraph(lessonId);
  const [expanded, setExpanded] = useState(false);

  const nodeCount = data?.nodes?.length ?? 0;

  /**
   * Project the published curated graph into the viewer's shape.
   *
   * Mirrors the teacher-side projection in material-hub.tsx: the viewer treats
   * `nodes[0]` as the centre, so the primary node is hoisted to the front, and
   * the curated `weight` drives node size directly (`mention_count` is unused
   * for curated graphs).
   */
  const viewerData = useMemo<LessonKnowledgeGraph>(() => {
    const primaryId = data?.primary_node_id ?? null;
    return {
      enabled: true,
      lesson_id: lessonId,
      total_concepts: nodeCount,
      nodes: [...(data?.nodes ?? [])]
        .sort(
          (a, b) =>
            Number(b.id === primaryId) - Number(a.id === primaryId) ||
            b.weight - a.weight,
        )
        .map((n) => ({
          id: n.id,
          label: n.label,
          type: n.type,
          definition: n.definition ?? null,
          weight: n.weight,
        })),
      edges: (data?.edges ?? []).map((e) => ({
        source: e.source,
        target: e.target,
        relation: e.relation,
        weight: 1,
      })),
    } as LessonKnowledgeGraph;
  }, [data, lessonId, nodeCount]);

  // Teacher hasn't published a map — render nothing.
  if (!data || !data.published || nodeCount === 0) return null;

  return (
    <div
      className="glass ghost-border shadow-glass rounded-xl overflow-hidden"
      data-testid="course-learn-knowledge-map"
    >
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-between gap-2 px-6 py-4 sm:px-8 hover:bg-m3-surface-container/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-m3-secondary" />
          <span className="text-xs font-headline font-semibold uppercase tracking-wider text-m3-on-surface-variant">
            {t("course_learn.knowledge_map")}
          </span>
          <span className="text-xs text-m3-on-surface-variant">
            {t("teacher_lesson_materials.kg.node_count", {
              count: nodeCount,
            })}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-m3-primary">
          <Maximize2 className="h-4 w-4" />
          {t("teacher_lesson_materials.kg.expand")}
        </span>
      </button>

      {/* Same full-screen explorer as the teacher side, minus edit/publish. */}
      {expanded && (
        <KnowledgeGraphDetail
          data={viewerData}
          title={t("course_learn.knowledge_map")}
          onClose={() => setExpanded(false)}
          source="curated"
        />
      )}
    </div>
  );
}

export default LessonKnowledgeMap;

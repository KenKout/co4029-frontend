import type { CuratedKGDraft } from "@/lib/api/types";
import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

/**
 * The two graph projections the full-screen explorer is fed, extracted verbatim
 * from the former 1422-line material-hub.tsx.
 */

/**
 * Project the curated graph into the viewer's shape. The viewer treats nodes[0]
 * as the centre, so the primary node is hoisted to the front; `mention_count`
 * is unused here so the curated `weight` drives node size directly.
 */
export function projectCuratedGraph(
  lessonId: string,
  curatedData: CuratedKGDraft | undefined,
): LessonKnowledgeGraph {
  return {
    enabled: true,
    lesson_id: lessonId,
    total_concepts: curatedData?.nodes.length ?? 0,
    nodes: [...(curatedData?.nodes ?? [])]
      .sort(
        (a, b) =>
          Number(b.is_primary) - Number(a.is_primary) || b.weight - a.weight,
      )
      .map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        definition: n.definition ?? null,
        weight: n.weight,
      })),
    edges: (curatedData?.edges ?? []).map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      weight: 1,
    })),
  } as LessonKnowledgeGraph;
}

/**
 * Prefer the fuller detail fetch (limit=60) once it lands; fall back to the
 * preview data so opening feels instant rather than waiting on the larger
 * request, and to an empty graph before either has resolved.
 */
export function resolveDetailGraph(
  lessonId: string,
  detailData: LessonKnowledgeGraph | undefined,
  data: LessonKnowledgeGraph | undefined,
): LessonKnowledgeGraph {
  return (detailData ??
    data ?? {
      enabled: true,
      lesson_id: lessonId,
      total_concepts: 0,
      nodes: [],
      edges: [],
    }) as LessonKnowledgeGraph;
}

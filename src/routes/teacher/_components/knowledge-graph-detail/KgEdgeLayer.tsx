import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

import { KgEdge } from "./KgEdge";
import { radiusFor } from "./helpers";
import type { KgNodeById, KgVec } from "./types";

/**
 * The edge pass of the world <g>. Resolves each edge's endpoints and radii, then
 * hands the per-link drawing to {@link KgEdge}. Edges whose endpoints fell
 * outside the fetched node window are skipped, exactly as before.
 */
export function KgEdgeLayer({
  edges,
  positions,
  nodeById,
  maxW,
  minW,
  activeId,
}: {
  edges: LessonKnowledgeGraph["edges"];
  positions: Map<string, KgVec>;
  nodeById: KgNodeById;
  maxW: number;
  minW: number;
  activeId: string | null;
}) {
  return (
    <>
      {edges.map((e, i) => {
        const a = positions.get(e.source);
        const b = positions.get(e.target);
        if (!a || !b) return null;
        const isPrereq = e.relation === "PREREQUISITE_OF";
        const connected =
          !!activeId && (e.source === activeId || e.target === activeId);
        const dim = !!activeId && !connected;
        const rb = radiusFor(
          nodeById.get(e.target)?.weight ?? minW,
          maxW,
          minW,
        );
        const ra = radiusFor(
          nodeById.get(e.source)?.weight ?? minW,
          maxW,
          minW,
        );
        return (
          <KgEdge
            key={i}
            a={a}
            b={b}
            ra={ra}
            rb={rb}
            isPrereq={isPrereq}
            connected={connected}
            dim={dim}
          />
        );
      })}
    </>
  );
}

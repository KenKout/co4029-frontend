import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Brain, ChevronDown, Minus, Plus, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { usePublishedLessonKnowledgeGraph } from "@/lib/api/hooks/materials";
import type { CuratedKGNode } from "@/lib/api/types";

/**
 * Student-facing, read-only "Knowledge map" panel for the reading-lesson view.
 *
 * Renders the teacher's PUBLISHED curated knowledge graph (never the draft).
 * Collapsible so it doesn't crowd the reader; hidden entirely when the teacher
 * has not published a graph for the lesson. Interaction is deliberately light —
 * pan, zoom, and click-to-focus a node's detail — no editing.
 *
 * Layout is a deterministic radial: the primary (centre) node sits in the
 * middle, everything else fans out on rings by connection distance, so the map
 * reads as "this core concept, and what hangs off it". Pure SVG + one <g>
 * transform; no graph library.
 */

interface Vec {
  x: number;
  y: number;
}

interface Transform {
  tx: number;
  ty: number;
  scale: number;
}

const WORLD_W = 1200;
const WORLD_H = 800;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;

function radiusFor(weight: number): number {
  // Clamp weight 1..100 → 12..30px.
  const w = Math.max(1, Math.min(100, weight));
  return 12 + (w / 100) * 18;
}

/**
 * Radial layout rooted at the primary node. Depth = shortest hop distance from
 * the primary over undirected adjacency; each depth band is a ring. Nodes
 * unreachable from the primary (or when there's no primary) land on an outer
 * ring so nothing vanishes.
 */
function layoutRadial(
  nodes: CuratedKGNode[],
  edges: { source: string; target: string }[],
  primaryId: string | null,
): Map<string, Vec> {
  const pos = new Map<string, Vec>();
  if (nodes.length === 0) return pos;

  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;

  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push(e.target);
    adj.get(e.target)!.push(e.source);
  }

  const root =
    primaryId && nodes.some((n) => n.id === primaryId)
      ? primaryId
      : (nodes.find((n) => n.is_primary)?.id ?? nodes[0].id);

  // BFS depth from the root.
  const depth = new Map<string, number>();
  depth.set(root, 0);
  const queue = [root];
  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id)!;
    for (const nb of adj.get(id) ?? []) {
      if (!depth.has(nb)) {
        depth.set(nb, d + 1);
        queue.push(nb);
      }
    }
  }
  // Unreached nodes get pushed to an outer ring.
  let maxDepth = 0;
  for (const d of depth.values()) maxDepth = Math.max(maxDepth, d);
  const orphanDepth = maxDepth + 1;
  for (const n of nodes) {
    if (!depth.has(n.id)) depth.set(n.id, orphanDepth);
  }

  // Group by depth, place each ring's nodes evenly around the circle.
  const byDepth = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depth.get(n.id)!;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(n.id);
  }

  const ringGap = Math.min(WORLD_W, WORLD_H) * 0.16;
  for (const [d, ids] of byDepth) {
    if (d === 0) {
      pos.set(ids[0], { x: cx, y: cy });
      // If somehow multiple depth-0, nudge extras onto ring 1.
      ids.slice(1).forEach((id, i) => {
        const a = (i / Math.max(1, ids.length - 1)) * Math.PI * 2;
        pos.set(id, { x: cx + ringGap * Math.cos(a), y: cy + ringGap * Math.sin(a) });
      });
      continue;
    }
    const radius = d * ringGap;
    ids.forEach((id, i) => {
      // Offset every other ring so nodes don't line up radially.
      const angle = (i / ids.length) * Math.PI * 2 + (d % 2) * (Math.PI / ids.length);
      pos.set(id, {
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      });
    });
  }
  return pos;
}

export function LessonKnowledgeMap({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const { data } = usePublishedLessonKnowledgeGraph(lessonId);
  const [open, setOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const nodes = useMemo(() => data?.nodes ?? [], [data?.nodes]);
  const edges = useMemo(() => data?.edges ?? [], [data?.edges]);
  const primaryId = data?.primary_node_id ?? null;
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const positions = useMemo(
    () => layoutRadial(nodes, edges, primaryId),
    [nodes, edges, primaryId],
  );

  const [transform, setTransform] = useState<Transform>({ tx: 0, ty: 0, scale: 1 });
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef<{ active: boolean; lastX: number; lastY: number; moved: boolean }>(
    { active: false, lastX: 0, lastY: 0, moved: false },
  );

  const fit = useMemo(
    () => () => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scale = Math.min(rect.width / WORLD_W, rect.height / WORLD_H, MAX_SCALE);
      setTransform({
        scale,
        tx: (rect.width - WORLD_W * scale) / 2,
        ty: (rect.height - WORLD_H * scale) / 2,
      });
    },
    [],
  );

  // Fit when the panel opens and the graph is present.
  useEffect(() => {
    if (open && nodes.length > 0) {
      const id = requestAnimationFrame(() => fit());
      return () => cancelAnimationFrame(id);
    }
  }, [open, nodes.length, fit]);

  // Non-passive wheel zoom so ctrl+scroll can't zoom the page (see the teacher
  // viewer for the same rationale).
  useEffect(() => {
    if (!open) return;
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      setTransform((prev) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
        const k = scale / prev.scale;
        return { scale, tx: sx - k * (sx - prev.tx), ty: sy - k * (sy - prev.ty) };
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [open]);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = rect.width / 2;
    const sy = rect.height / 2;
    setTransform((prev) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const k = scale / prev.scale;
      return { scale, tx: sx - k * (sx - prev.tx), ty: sy - k * (sy - prev.ty) };
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.lastX;
    const dy = e.clientY - drag.current.lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.current.moved = true;
    setTransform((prev) => ({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }));
    drag.current.lastX = e.clientX;
    drag.current.lastY = e.clientY;
  };
  const onPointerUp = () => {
    drag.current.active = false;
  };

  const neighborIds = useMemo(() => {
    const s = new Set<string>();
    if (!selected) return s;
    for (const e of edges) {
      if (e.source === selected) s.add(e.target);
      else if (e.target === selected) s.add(e.source);
    }
    return s;
  }, [selected, edges]);

  // Teacher hasn't published a map — render nothing.
  if (!data || !data.published || nodes.length === 0) return null;

  const selectedNode = selected ? nodeById.get(selected) : null;

  return (
    <div className="rounded-xl border border-m3-outline-variant/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 bg-m3-surface-container-low hover:bg-m3-surface-container transition-colors"
      >
        <span className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-m3-secondary" />
          <span className="text-xs font-headline font-semibold uppercase tracking-wider text-m3-on-surface-variant">
            {t("course_learn.knowledge_map")}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-m3-on-surface-variant transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="relative h-[420px] w-full bg-m3-surface">
          <svg
            ref={svgRef}
            className={cn(
              "h-full w-full touch-none select-none",
              drag.current.active ? "cursor-grabbing" : "cursor-grab",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            role="application"
            aria-label={t("course_learn.knowledge_map")}
          >
            <g
              transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
            >
              {/* Edges */}
              {edges.map((e, i) => {
                const a = positions.get(e.source);
                const b = positions.get(e.target);
                if (!a || !b) return null;
                const connected =
                  !!selected && (e.source === selected || e.target === selected);
                const dim = !!selected && !connected;
                const isPrereq = e.relation === "PREREQUISITE_OF";
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={isPrereq ? "#d97706" : "#94a3b8"}
                    strokeWidth={connected ? 2.5 : 1.5}
                    strokeDasharray={isPrereq ? "5 4" : undefined}
                    opacity={dim ? 0.15 : 0.55}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((n) => {
                const p = positions.get(n.id);
                if (!p) return null;
                const r = radiusFor(n.weight);
                const isPrimary = n.id === primaryId || n.is_primary;
                const isSelected = selected === n.id;
                const isNeighbor = !!selected && !isSelected && neighborIds.has(n.id);
                const dim = !!selected && !isSelected && !isNeighbor;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x} ${p.y})`}
                    opacity={dim ? 0.3 : 1}
                    className="cursor-pointer transition-opacity"
                    onPointerUp={() => {
                      if (!drag.current.moved) {
                        setSelected((cur) => (cur === n.id ? null : n.id));
                      }
                    }}
                  >
                    {(isPrimary || isSelected) && (
                      <circle
                        r={r + 6}
                        fill="none"
                        stroke={isPrimary ? "#7c3aed" : "#1e40af"}
                        strokeWidth={2}
                        opacity={0.4}
                      />
                    )}
                    <circle
                      r={r}
                      fill={
                        isPrimary
                          ? "#7c3aed"
                          : isSelected
                            ? "#1e40af"
                            : isNeighbor
                              ? "#bfdbfe"
                              : "#dbeafe"
                      }
                      stroke={isPrimary ? "#6d28d9" : "#3b82f6"}
                      strokeWidth={isPrimary || isSelected ? 2.5 : 1.5}
                    />
                    <text
                      y={r + 14}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={isPrimary || isSelected ? 700 : 600}
                      fill="currentColor"
                      className="pointer-events-none text-m3-on-surface"
                    >
                      {n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Zoom controls */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 rounded-xl border border-m3-outline-variant/20 bg-m3-surface/95 p-1.5 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => zoomBy(1.25)}
              aria-label={t("course_learn.km_zoom_in")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => zoomBy(0.8)}
              aria-label={t("course_learn.km_zoom_out")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={fit}
              aria-label={t("course_learn.km_fit")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Selected-node detail card */}
          {selectedNode && (
            <div className="absolute top-3 left-3 w-64 max-w-[calc(100%-1.5rem)] rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest/98 p-3.5 shadow-glass backdrop-blur">
              <p className="font-headline font-bold text-sm text-m3-on-surface">
                {selectedNode.label}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-m3-secondary">
                {selectedNode.type}
              </p>
              {selectedNode.definition && (
                <p className="mt-1.5 text-xs leading-relaxed text-m3-on-surface-variant">
                  {selectedNode.definition}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LessonKnowledgeMap;

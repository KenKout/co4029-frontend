import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Brain,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { LessonKnowledgeGraph } from "@/lib/api/types/teacher";

/**
 * Full-screen, interactive knowledge-graph explorer.
 *
 * The compact {@link KnowledgeGraphPreview} in material-hub gives a glanceable
 * thumbnail; this is the "open it up and actually explore" view. It reuses the
 * same {@link LessonKnowledgeGraph} data shape (fetched at a higher node limit
 * by the caller) and layers on:
 *
 *  - PAN   — drag empty canvas (or one-finger drag on touch) to move around.
 *  - ZOOM  — mouse wheel / pinch, or the +/- controls, zooming toward the
 *            pointer so the concept under the cursor stays put.
 *  - DRAG  — grab a node to reposition it; the layout is a starting point, not
 *            a cage, so a teacher can untangle a cluster.
 *  - DETAIL— double-click a node to pin a relationship panel listing its
 *            prerequisites, what it unlocks, and related concepts.
 *
 * Rendering is plain SVG with a single <g> transform (translate+scale) — no
 * physics sim and no graph library, so it stays dependency-free and the node
 * positions never jitter between renders. Coordinates live in an abstract
 * "world" space; the transform maps world→screen.
 */

export interface KgVec {
  x: number;
  y: number;
}

interface Transform {
  tx: number;
  ty: number;
  scale: number;
}

const WORLD_W = 1600;
const WORLD_H = 1000;
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

/**
 * Deterministic radial layout in world space: heaviest concept at the centre,
 * the rest fanned out on rings by rank with golden-angle spacing so neighbours
 * never stack. Pure function of the node list, so positions are stable across
 * renders (the drag layer mutates a copy in state).
 */
function layoutWorld(nodes: LessonKnowledgeGraph["nodes"]): Map<string, KgVec> {
  const positions = new Map<string, KgVec>();
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  nodes.forEach((node, i) => {
    if (i === 0) {
      positions.set(node.id, { x: cx, y: cy });
      return;
    }
    // Three rings so a 60-node graph doesn't crowd a single band.
    const ring = i <= 8 ? 1 : i <= 24 ? 2 : 3;
    const radius = ring * Math.min(WORLD_W, WORLD_H) * 0.16;
    const angle = i * 2.399963; // golden angle (radians)
    positions.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });
  return positions;
}

function radiusFor(weight: number, maxW: number, minW: number): number {
  if (maxW === minW) return 16;
  const t = (weight - minW) / (maxW - minW);
  return 12 + t * 22; // 12–34px in world units
}

export function KnowledgeGraphDetail({
  data,
  title,
  onClose,
}: {
  data: LessonKnowledgeGraph;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const nodes = useMemo(() => data.nodes ?? [], [data.nodes]);
  const edges = useMemo(() => data.edges ?? [], [data.edges]);

  const nodeById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );
  const maxW = useMemo(
    () => Math.max(...nodes.map((n) => n.weight), 1),
    [nodes],
  );
  const minW = useMemo(
    () => Math.min(...nodes.map((n) => n.weight), 1),
    [nodes],
  );

  // World-space node positions. Seeded from the deterministic layout, then
  // mutated in place when a teacher drags a node.
  const [positions, setPositions] = useState<Map<string, KgVec>>(() =>
    layoutWorld(nodes),
  );
  useEffect(() => {
    setPositions(layoutWorld(nodes));
  }, [nodes]);
  // Mirror of the latest positions so focusNode (called from event handlers
  // and relation-chip jumps) can read current coords without going stale.
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const [transform, setTransform] = useState<Transform>({
    tx: 0,
    ty: 0,
    scale: 1,
  });
  // When true, the world <g> animates its transform (used for camera focus so
  // the jump to a clicked node glides). Turned off during pan/drag/zoom so
  // those stay instant and lag-free.
  const [smooth, setSmooth] = useState(false);
  const smoothTimer = useRef<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  // The node whose relationship panel is pinned. Now a SINGLE click selects a
  // node: it pins the panel and focuses the camera on that node.
  const [pinned, setPinned] = useState<string | null>(null);

  // Fit the whole world into the viewport on first mount / when the node set
  // changes, so the graph opens framed rather than zoomed into a corner.
  const fitToView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(
      rect.width / WORLD_W,
      rect.height / WORLD_H,
      MAX_SCALE,
    );
    setTransform({
      scale,
      tx: (rect.width - WORLD_W * scale) / 2,
      ty: (rect.height - WORLD_H * scale) / 2,
    });
  }, []);

  useEffect(() => {
    fitToView();
  }, [fitToView, nodes.length]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pinned) setPinned(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pinned]);

  // --- Pointer interaction -------------------------------------------------
  // A single pointer handler set covers three gestures. `drag.current` tracks
  // which one is active so move/up don't have to re-derive intent.
  const drag = useRef<{
    kind: "pan" | "node" | null;
    nodeId?: string;
    // last client coords (pan) or world offset from node centre (node drag)
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({ kind: null, lastX: 0, lastY: 0, moved: false });

  const clientToWorld = useCallback(
    (clientX: number, clientY: number): KgVec => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - transform.tx) / transform.scale,
        y: (sy - transform.ty) / transform.scale,
      };
    },
    [transform],
  );

  const onPointerDownBackground = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = {
      kind: "pan",
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  };

  const onPointerDownNode = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = {
      kind: "node",
      nodeId,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.kind) return;
    const dxScreen = e.clientX - d.lastX;
    const dyScreen = e.clientY - d.lastY;
    if (Math.abs(dxScreen) > 2 || Math.abs(dyScreen) > 2) d.moved = true;

    if (d.kind === "pan") {
      setTransform((prev) => ({
        ...prev,
        tx: prev.tx + dxScreen,
        ty: prev.ty + dyScreen,
      }));
    } else if (d.kind === "node" && d.nodeId) {
      // Convert the screen delta into world units so the node tracks the
      // cursor 1:1 regardless of zoom.
      const dxWorld = dxScreen / transform.scale;
      const dyWorld = dyScreen / transform.scale;
      const id = d.nodeId;
      setPositions((prev) => {
        const next = new Map(prev);
        const p = next.get(id);
        if (p) next.set(id, { x: p.x + dxWorld, y: p.y + dyWorld });
        return next;
      });
    }
    d.lastX = e.clientX;
    d.lastY = e.clientY;
  };

  const onPointerUp = () => {
    drag.current.kind = null;
  };

  // Wheel zoom toward the pointer: keep the world point under the cursor fixed
  // while scaling, which is what makes zoom feel anchored rather than drifting.
  //
  // Attached as a NATIVE, non-passive listener (see effect below) rather than
  // via React's onWheel. React registers wheel handlers as passive, so
  // e.preventDefault() there is silently ignored — which is why ctrl+scroll
  // used to zoom the whole browser page instead of the canvas. A non-passive
  // listener lets us cancel that default. We zoom the canvas on every wheel,
  // and on ctrl/⌘+wheel (trackpad pinch / browser-zoom gesture) we ALSO
  // preventDefault so the page never zooms out from under the graph.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      // Always cancel: prevents page scroll on plain wheel and, crucially,
      // browser page-zoom on ctrl/⌘+wheel.
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      setTransform((prev) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const scale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, prev.scale * factor),
        );
        const k = scale / prev.scale;
        // Solve so (sx,sy) maps to the same world point before/after.
        return {
          scale,
          tx: sx - k * (sx - prev.tx),
          ty: sy - k * (sy - prev.ty),
        };
      });
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, []);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = rect.width / 2;
    const sy = rect.height / 2;
    setTransform((prev) => {
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, prev.scale * factor),
      );
      const k = scale / prev.scale;
      return {
        scale,
        tx: sx - k * (sx - prev.tx),
        ty: sy - k * (sy - prev.ty),
      };
    });
  };

  // Glide the camera so a node lands in the centre of the canvas. Called on
  // single-click and on relation-chip jumps. Keeps the current zoom unless
  // we're very zoomed out, in which case it eases in a little so the focused
  // node is comfortably readable. Enables the transform transition for the
  // move, then disables it after the animation so pan/zoom stay instant.
  const focusNode = useCallback((nodeId: string) => {
    const svg = svgRef.current;
    const p = positionsRef.current.get(nodeId);
    if (!svg || !p) return;
    const rect = svg.getBoundingClientRect();
    setSmooth(true);
    if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
    smoothTimer.current = window.setTimeout(() => setSmooth(false), 420);
    setTransform((prev) => {
      const scale = Math.min(
        MAX_SCALE,
        Math.max(prev.scale, 0.9),
      );
      return {
        scale,
        tx: rect.width / 2 - p.x * scale,
        ty: rect.height / 2 - p.y * scale,
      };
    });
  }, []);

  useEffect(() => {
    return () => {
      if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
    };
  }, []);

  // Select a node: pin its relationship panel AND glide the camera to centre
  // it. Shared by single-click on a node and by relation-chip jump clicks, so
  // both routes behave identically. Always focuses (even when re-selecting via
  // a chip) so jumping to an off-screen neighbour brings it into view.
  const selectNode = useCallback(
    (nodeId: string) => {
      setPinned(nodeId);
      setHovered(null);
      focusNode(nodeId);
    },
    [focusNode],
  );

  // --- Relationship data for the pinned node -------------------------------
  const pinnedRelations = useMemo(() => {
    if (!pinned) return null;
    const prerequisites: string[] = []; // concepts that are prereq OF pinned
    const unlocks: string[] = []; // concepts pinned is prereq OF
    const related: string[] = [];
    for (const e of edges) {
      if (e.relation === "PREREQUISITE_OF") {
        if (e.target === pinned) prerequisites.push(e.source);
        else if (e.source === pinned) unlocks.push(e.target);
      } else {
        if (e.source === pinned) related.push(e.target);
        else if (e.target === pinned) related.push(e.source);
      }
    }
    return { prerequisites, unlocks, related };
  }, [pinned, edges]);

  // Neighbours of the currently-active node (pinned takes priority over hover)
  // so we can highlight its immediate connections and dim the rest.
  const activeId = pinned ?? hovered;
  const neighborIds = useMemo(() => {
    const set = new Set<string>();
    if (!activeId) return set;
    for (const e of edges) {
      if (e.source === activeId) set.add(e.target);
      else if (e.target === activeId) set.add(e.source);
    }
    return set;
  }, [activeId, edges]);

  // Screen-space position of the pinned node, so the relationship popup can be
  // anchored directly over that node (not parked in a fixed corner). Derived
  // from transform + world position, so it tracks live as the user pans/zooms.
  // Reads the svg box during render — safe because the panel only mounts once
  // a node is pinned (post-mount). Also decides above/below placement so the
  // popup never spills off the top edge when the node sits high in the canvas.
  const pinnedScreen = useMemo(() => {
    if (!pinned) return null;
    const p = positions.get(pinned);
    const svg = svgRef.current;
    if (!p || !svg) return null;
    const rect = svg.getBoundingClientRect();
    const x = p.x * transform.scale + transform.tx;
    const y = p.y * transform.scale + transform.ty;
    const r = radiusFor(nodeById.get(pinned)?.weight ?? minW, maxW, minW) *
      transform.scale;
    // Clamp the horizontal anchor so a centred (translateX(-50%)) 288px panel
    // stays fully on-canvas even when the node is near an edge.
    const half = 150;
    const clampedX = Math.min(Math.max(x, half), rect.width - half);
    // Prefer above; flip below when the node is in the top third.
    const below = y < rect.height * 0.34;
    return { x: clampedX, y, r, below };
  }, [pinned, positions, transform, nodeById, maxW, minW]);

  const overlay = (
    <div className="fixed inset-0 z-50 flex flex-col bg-m3-surface">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-m3-outline-variant/20 bg-m3-surface-container-lowest px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Brain className="h-5 w-5 shrink-0 text-m3-secondary" />
          <h2 className="truncate font-headline font-bold text-m3-on-surface">
            {title}
          </h2>
          <span className="shrink-0 rounded-full bg-m3-surface-container px-2 py-0.5 text-[11px] font-semibold text-m3-on-surface-variant">
            {t("teacher_lesson_materials.kg.node_count", {
              count: nodes.length,
            })}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          className={cn(
            "h-full w-full touch-none select-none",
            drag.current.kind === "pan" ? "cursor-grabbing" : "cursor-grab",
          )}
          onPointerDown={onPointerDownBackground}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          role="application"
          aria-label={title}
        >
          <defs>
            <marker
              id="kgd-arrow-prereq"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M0,1 L9,5 L0,9 z" fill="#d97706" />
            </marker>
            <marker
              id="kgd-arrow-related"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto-start-reverse"
            >
              <path d="M0,1 L9,5 L0,9 z" fill="#94a3b8" />
            </marker>
          </defs>

          <g
            transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
            style={{
              transition: smooth
                ? "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)"
                : undefined,
            }}
          >
            {/* Edges */}
            {edges.map((e, i) => {
              const a = positions.get(e.source);
              const b = positions.get(e.target);
              if (!a || !b) return null;
              const isPrereq = e.relation === "PREREQUISITE_OF";
              const connected =
                !!activeId && (e.source === activeId || e.target === activeId);
              const dim = !!activeId && !connected;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len;
              const uy = dy / len;
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
              const x1 = a.x + ux * (ra + 3);
              const y1 = a.y + uy * (ra + 3);
              const x2 = b.x - ux * (rb + 5);
              const y2 = b.y - uy * (rb + 5);
              const nx = uy;
              const ny = -ux;
              const curve = Math.min(len * 0.16, 60);
              const mx = (x1 + x2) / 2 + nx * curve;
              const my = (y1 + y2) / 2 + ny * curve;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                  fill="none"
                  stroke={isPrereq ? "#d97706" : "#94a3b8"}
                  strokeWidth={connected ? 2.4 : isPrereq ? 1.6 : 1.2}
                  strokeDasharray={isPrereq && !connected ? "6 4" : undefined}
                  markerEnd={
                    isPrereq
                      ? "url(#kgd-arrow-prereq)"
                      : "url(#kgd-arrow-related)"
                  }
                  opacity={dim ? 0.08 : connected ? 0.95 : isPrereq ? 0.55 : 0.32}
                  className="transition-opacity"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((n, i) => {
              const p = positions.get(n.id);
              if (!p) return null;
              const r = radiusFor(n.weight, maxW, minW);
              const isCenter = i === 0;
              const isActive = activeId === n.id;
              const isNeighbor =
                !!activeId && !isActive && neighborIds.has(n.id);
              const dim = !!activeId && !isActive && !isNeighbor;
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x} ${p.y})`}
                  opacity={dim ? 0.28 : 1}
                  className="cursor-pointer transition-opacity"
                  onPointerDown={(e) => onPointerDownNode(e, n.id)}
                  onPointerUp={() => {
                    // A single click that didn't turn into a drag SELECTS the
                    // node: pin its relationship panel and glide the camera so
                    // the node centres. Clicking the already-selected node
                    // clears the selection. (Was double-click before.)
                    if (drag.current.moved) return;
                    // Toggle off if it's already the selected node; otherwise
                    // select (pin panel + centre camera) via the shared path.
                    if (pinned === n.id) setPinned(null);
                    else selectNode(n.id);
                  }}
                  onMouseEnter={() => !pinned && setHovered(n.id)}
                  onMouseLeave={() => !pinned && setHovered(null)}
                >
                  {(isActive || isCenter) && (
                    <circle
                      r={r + 7}
                      fill="none"
                      stroke={isActive ? "#1e40af" : "#3b82f6"}
                      strokeWidth={2}
                      opacity={0.35}
                    />
                  )}
                  <circle
                    r={r}
                    fill={
                      isCenter || isActive
                        ? "#1e40af"
                        : isNeighbor
                          ? "#bfdbfe"
                          : "#dbeafe"
                    }
                    stroke={isActive || isCenter ? "#1e3a8a" : "#3b82f6"}
                    strokeWidth={isActive ? 3 : 1.5}
                  />
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={isActive || isCenter ? 700 : 600}
                    fill="currentColor"
                    className={cn(
                      "pointer-events-none",
                      isActive
                        ? "text-m3-on-surface"
                        : "text-m3-on-surface-variant",
                    )}
                  >
                    {n.label.length > 28 ? `${n.label.slice(0, 27)}…` : n.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom / reset controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 rounded-xl border border-m3-outline-variant/20 bg-m3-surface/95 p-1.5 shadow-glass backdrop-blur">
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            aria-label={t("teacher_lesson_materials.kg.zoom_in")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            aria-label={t("teacher_lesson_materials.kg.zoom_out")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={fitToView}
            aria-label={t("teacher_lesson_materials.kg.fit_view")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Legend + hint */}
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

        {/* Relationship popup — anchored over the selected node (single-click).
            Because the camera centres the node, this normally floats mid-canvas
            just above the concept it describes. It's translated -50% on X to
            centre on the node, and placed either above (default) or below (when
            the node is high up) so it never clips the top edge. */}
        {pinned && pinnedRelations && pinnedScreen && nodeById.get(pinned) && (
          <div
            className="absolute z-10 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest/98 p-4 shadow-glass backdrop-blur"
            style={{
              left: pinnedScreen.x,
              top: pinnedScreen.below
                ? pinnedScreen.y + pinnedScreen.r + 12
                : undefined,
              bottom: pinnedScreen.below
                ? undefined
                : `calc(100% - ${pinnedScreen.y - pinnedScreen.r - 12}px)`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-headline font-bold text-m3-on-surface">
                  {nodeById.get(pinned)!.label}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-m3-secondary">
                  {nodeById.get(pinned)!.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPinned(null)}
                aria-label={t("common.close")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-m3-surface-container-high"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {nodeById.get(pinned)!.definition && (
              <p className="mt-1.5 text-xs leading-relaxed text-m3-on-surface-variant">
                {nodeById.get(pinned)!.definition}
              </p>
            )}

            <div className="mt-3 max-h-[40vh] space-y-3 overflow-y-auto">
              <RelationGroup
                label={t("teacher_lesson_materials.kg.rel_prerequisites")}
                ids={pinnedRelations.prerequisites}
                nodeById={nodeById}
                tone="amber"
                onJump={selectNode}
                emptyLabel={t("teacher_lesson_materials.kg.rel_none")}
              />
              <RelationGroup
                label={t("teacher_lesson_materials.kg.rel_unlocks")}
                ids={pinnedRelations.unlocks}
                nodeById={nodeById}
                tone="amber"
                onJump={selectNode}
                emptyLabel={t("teacher_lesson_materials.kg.rel_none")}
              />
              <RelationGroup
                label={t("teacher_lesson_materials.kg.rel_related")}
                ids={pinnedRelations.related}
                nodeById={nodeById}
                tone="slate"
                onJump={selectNode}
                emptyLabel={t("teacher_lesson_materials.kg.rel_none")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function RelationGroup({
  label,
  ids,
  nodeById,
  tone,
  onJump,
  emptyLabel,
}: {
  label: string;
  ids: string[];
  nodeById: Map<string, LessonKnowledgeGraph["nodes"][number]>;
  tone: "amber" | "slate";
  onJump: (id: string) => void;
  emptyLabel: string;
}) {
  // De-dupe (a concept can be reachable by more than one edge) and resolve to
  // labels, dropping ids we don't have a node for (out-of-window neighbours).
  const items = Array.from(new Set(ids))
    .map((id) => nodeById.get(id))
    .filter((n): n is LessonKnowledgeGraph["nodes"][number] => !!n);

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs italic text-m3-on-surface-variant/70">
          {emptyLabel}
        </p>
      ) : (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onJump(n.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                tone === "amber"
                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
              )}
            >
              {n.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default KnowledgeGraphDetail;

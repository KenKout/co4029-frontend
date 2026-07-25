import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Brain,
  Circle,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Workflow,
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

export type KgLayoutMode = "circular" | "tree";

/**
 * Deterministic radial layout in world space: heaviest concept at the centre,
 * the rest fanned out on rings by rank with golden-angle spacing so neighbours
 * never stack. Pure function of the node list, so positions are stable across
 * renders (the drag layer mutates a copy in state).
 */
function layoutCircular(
  nodes: LessonKnowledgeGraph["nodes"],
): Map<string, KgVec> {
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

/**
 * Hierarchical (tree) layout in world space.
 *
 * The heaviest concept (nodes[0]) is the root, placed at the top-centre. Rank 2
 * is every node directly connected to the root; rank 3 is their neighbours; and
 * so on — a breadth-first spanning tree over the graph, expanding vertically
 * downward. Adjacency is UNDIRECTED and spans BOTH edge kinds (PREREQUISITE_OF
 * and RELATED_TO), so a node lands one rank below whatever first connects it to
 * the root regardless of edge direction. (Edges are still colour-coded when
 * drawn; the direction just doesn't gate the ranking.)
 *
 * Edge cases (see the chat thread — these are the ones that actually occur in
 * the KG data):
 *  - CYCLES / MULTIPLE PARENTS: BFS first-visit-wins means each node is placed
 *    exactly once at its shortest hop-distance from the root, so a cycle can't
 *    loop forever and a node with several connections sits under whichever
 *    neighbour reached it first (its shortest path to the root).
 *  - FOREST / disconnected components (nodes with edges among themselves but
 *    unreachable from the root): after the root's BFS, any still-unplaced
 *    edge-bearing node is seeded as a local root and laid out in the same rank
 *    bands, so whole sub-graphs hang below the main tree instead of vanishing.
 *  - ORPHANS (no edges of any kind): parked in a row along the very bottom as
 *    leaves, per the requested behaviour — present but clearly peripheral.
 */
function layoutTree(
  nodes: LessonKnowledgeGraph["nodes"],
  edges: LessonKnowledgeGraph["edges"],
): Map<string, KgVec> {
  const positions = new Map<string, KgVec>();
  if (nodes.length === 0) return positions;

  const ids = nodes.map((n) => n.id);
  const idSet = new Set(ids);

  // UNDIRECTED adjacency over ALL edges. The tree is a breadth-first spanning
  // tree rooted at the heaviest node: whatever touches the root (in either
  // direction, prerequisite OR related) lands on the next rank, and so on
  // outward. Using prereq-direction only was the bug — if the root wasn't a
  // prerequisite *source* (e.g. a hub other concepts point to, or one whose
  // links are mostly RELATED_TO), its rank-2 was empty and the tree collapsed.
  const adj = new Map<string, string[]>();
  const hasAnyEdge = new Set<string>();
  const addAdj = (a: string, b: string) => {
    const list = adj.get(a) ?? [];
    list.push(b);
    adj.set(a, list);
  };
  for (const e of edges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    hasAnyEdge.add(e.source);
    hasAnyEdge.add(e.target);
    addAdj(e.source, e.target);
    addAdj(e.target, e.source);
  }

  // Assign each node a depth = shortest hop-distance from a root via BFS. First
  // visit wins (standard BFS = shortest path), so each node sits one rank below
  // whichever neighbour reached it first. BFS from the heaviest node, then seed
  // any still-unplaced edge-bearing node as a local root so disconnected
  // sub-graphs still get laid out instead of vanishing.
  const depth = new Map<string, number>();
  const placed = new Set<string>();
  const bfs = (start: string) => {
    if (placed.has(start)) return;
    placed.add(start);
    depth.set(start, 0);
    const queue: Array<{ id: string; d: number }> = [{ id: start, d: 0 }];
    while (queue.length) {
      const { id, d } = queue.shift()!;
      for (const nb of adj.get(id) ?? []) {
        if (placed.has(nb)) continue;
        placed.add(nb);
        depth.set(nb, d + 1);
        queue.push({ id: nb, d: d + 1 });
      }
    }
  };

  bfs(ids[0]);
  // Forest: remaining nodes that still have edges become local roots, in the
  // node list's (weight-sorted) order for determinism.
  for (const id of ids) {
    if (!placed.has(id) && hasAnyEdge.has(id)) bfs(id);
  }

  // Orphans: no edges at all → a row along the bottom.
  const orphans = ids.filter((id) => !hasAnyEdge.has(id));

  // Group placed nodes by depth to lay out level bands.
  const byDepth = new Map<number, string[]>();
  let maxDepth = 0;
  for (const id of ids) {
    if (!placed.has(id)) continue;
    const d = depth.get(id) ?? 0;
    maxDepth = Math.max(maxDepth, d);
    const row = byDepth.get(d) ?? [];
    row.push(id);
    byDepth.set(d, row);
  }

  const LEVEL_GAP = 190;
  const NODE_GAP = 240;
  const topMargin = 120;
  const cx = WORLD_W / 2;

  // Width of the widest band drives horizontal centring of every band.
  let widest = 1;
  for (const [, row] of byDepth) widest = Math.max(widest, row.length);
  for (let d = 0; d <= maxDepth; d++) {
    const row = byDepth.get(d) ?? [];
    const rowWidth = (row.length - 1) * NODE_GAP;
    const startX = cx - rowWidth / 2;
    row.forEach((id, i) => {
      positions.set(id, {
        x: row.length === 1 ? cx : startX + i * NODE_GAP,
        y: topMargin + d * LEVEL_GAP,
      });
    });
  }

  // Orphan row: one level below the deepest tree band, wrapped so a big pile of
  // orphans doesn't run off the sides.
  if (orphans.length > 0) {
    const perRow = Math.max(1, Math.min(orphans.length, widest, 10));
    const baseY = topMargin + (maxDepth + 1.4) * LEVEL_GAP;
    orphans.forEach((id, i) => {
      const col = i % perRow;
      const rowN = Math.floor(i / perRow);
      const rowCount = Math.min(perRow, orphans.length - rowN * perRow);
      const rowWidth = (rowCount - 1) * NODE_GAP;
      const startX = cx - rowWidth / 2;
      positions.set(id, {
        x: rowCount === 1 ? cx : startX + col * NODE_GAP,
        y: baseY + rowN * LEVEL_GAP,
      });
    });
  }

  return positions;
}

function computeLayout(
  mode: KgLayoutMode,
  nodes: LessonKnowledgeGraph["nodes"],
  edges: LessonKnowledgeGraph["edges"],
): Map<string, KgVec> {
  return mode === "tree" ? layoutTree(nodes, edges) : layoutCircular(nodes);
}

function radiusFor(weight: number, maxW: number, minW: number): number {
  if (maxW === minW) return 16;
  const t = (weight - minW) / (maxW - minW);
  return 12 + t * 22; // 12–34px in world units
}

export type KgSource = "ai" | "curated";

export function KnowledgeGraphDetail({
  data,
  title,
  onClose,
  source = "ai",
  onSourceChange,
  onEdit,
}: {
  data: LessonKnowledgeGraph;
  title: string;
  onClose: () => void;
  /** Which graph is being displayed. The parent owns the fetch for each. */
  source?: KgSource;
  /** Omit to hide the AI/Curated toggle entirely (single-source callers). */
  onSourceChange?: (next: KgSource) => void;
  /** Omit to hide the Edit button. Only enabled while viewing `curated`. */
  onEdit?: () => void;
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

  // Layout mode: circular (radial rings) or tree (prereq hierarchy). Toggling
  // re-seeds positions from the chosen layout.
  const [layoutMode, setLayoutMode] = useState<KgLayoutMode>("circular");

  // World-space node positions. Seeded from the chosen layout, then mutated in
  // place when a teacher drags a node.
  const [positions, setPositions] = useState<Map<string, KgVec>>(() =>
    computeLayout("circular", nodes, edges),
  );
  useEffect(() => {
    setPositions(computeLayout(layoutMode, nodes, edges));
  }, [nodes, edges, layoutMode]);
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

  // Fit the current layout into the viewport. Frames the ACTUAL node bounds
  // (not the fixed WORLD box) with padding, so both the compact circular layout
  // and a tall tree — which can extend well past WORLD_H via deep levels + the
  // orphan rows — open fully visible rather than clipped or zoomed into a
  // corner. Reads positionsRef so it always sees the latest layout.
  const fitToView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pts = Array.from(positionsRef.current.values());
    let minX = 0;
    let minY = 0;
    let boxW = WORLD_W;
    let boxH = WORLD_H;
    if (pts.length > 0) {
      const pad = 120; // world units of breathing room around the extremes
      minX = Math.min(...pts.map((p) => p.x)) - pad;
      minY = Math.min(...pts.map((p) => p.y)) - pad;
      boxW = Math.max(...pts.map((p) => p.x)) + pad - minX;
      boxH = Math.max(...pts.map((p) => p.y)) + pad - minY;
    }
    const scale = Math.min(rect.width / boxW, rect.height / boxH, MAX_SCALE);
    setTransform({
      scale,
      tx: (rect.width - boxW * scale) / 2 - minX * scale,
      ty: (rect.height - boxH * scale) / 2 - minY * scale,
    });
  }, []);

  // Refit whenever the node set OR the layout mode changes. Deferred a frame so
  // the positions state (set in the layout effect above) has committed before
  // we measure it.
  useEffect(() => {
    const id = requestAnimationFrame(() => fitToView());
    return () => cancelAnimationFrame(id);
  }, [fitToView, nodes.length, layoutMode]);

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
    // Clamp the horizontal anchor so a centred (translateX(-50%)) 384px panel
    // stays fully on-canvas even when the node is near an edge.
    const half = 200;
    const clampedX = Math.min(Math.max(x, half), rect.width - half);
    // Prefer above; flip below when the node is in the top third.
    const below = y < rect.height * 0.34;
    return { x: clampedX, y, r, below };
  }, [pinned, positions, transform, nodeById, maxW, minW]);

  const overlay = (
    // Full-screen, edge-to-edge explorer (not a windowed dialog) — the graph
    // wants all the room it can get. Escape closes it (see the key handler);
    // node-detail closing is handled by the popup's own controls.
    <div
      className="fixed inset-0 z-50 flex flex-col bg-m3-surface"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
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
        <div className="flex items-center gap-2 shrink-0">
          {/* Graph source: the AI-derived concept graph (read-only, regenerated
              on every ingest) vs the teacher's curated graph (editable, what
              students see once published). Only rendered when the parent wires
              up a curated source. */}
          {onSourceChange && (
            <div
              role="group"
              aria-label={t("teacher_lesson_materials.kg.source_label")}
              className="flex items-center rounded-lg border border-m3-outline-variant/30 bg-m3-surface-container p-0.5"
            >
              <button
                type="button"
                onClick={() => onSourceChange("ai")}
                aria-pressed={source === "ai"}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  source === "ai"
                    ? "bg-m3-primary text-white"
                    : "text-m3-on-surface-variant hover:text-m3-primary",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("teacher_lesson_materials.kg.source_ai")}
              </button>
              <button
                type="button"
                onClick={() => onSourceChange("curated")}
                aria-pressed={source === "curated"}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  source === "curated"
                    ? "bg-m3-primary text-white"
                    : "text-m3-on-surface-variant hover:text-m3-primary",
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("teacher_lesson_materials.kg.source_curated")}
              </button>
            </div>
          )}
          {/* Layout mode toggle: Circular (radial) vs Tree (prereq hierarchy). */}
          <div
            role="group"
            aria-label={t("teacher_lesson_materials.kg.layout_label")}
            className="flex items-center rounded-lg border border-m3-outline-variant/30 bg-m3-surface-container p-0.5"
          >
            <button
              type="button"
              onClick={() => setLayoutMode("circular")}
              aria-pressed={layoutMode === "circular"}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                layoutMode === "circular"
                  ? "bg-m3-primary text-white"
                  : "text-m3-on-surface-variant hover:text-m3-primary",
              )}
            >
              <Circle className="h-3.5 w-3.5" />
              {t("teacher_lesson_materials.kg.layout_circular")}
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("tree")}
              aria-pressed={layoutMode === "tree"}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                layoutMode === "tree"
                  ? "bg-m3-primary text-white"
                  : "text-m3-on-surface-variant hover:text-m3-primary",
              )}
            >
              <Workflow className="h-3.5 w-3.5" />
              {t("teacher_lesson_materials.kg.layout_tree")}
            </button>
          </div>
          {/* Edit lives HERE (in the detail screen), not on the lesson-settings
              card, so view and edit are two modes of the same screen. Only the
              curated graph is editable — the AI graph is regenerated on every
              ingest, so edits to it would be silently overwritten. */}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              disabled={source !== "curated"}
              title={
                source === "curated"
                  ? t("teacher_lesson_materials.kg.edit")
                  : t("teacher_lesson_materials.kg.edit_ai_disabled")
              }
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                source === "curated"
                  ? "bg-m3-surface-container text-m3-on-surface-variant hover:text-m3-primary"
                  : "bg-m3-surface-container/50 text-m3-on-surface-variant/40 cursor-not-allowed",
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
              {t("teacher_lesson_materials.kg.edit")}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
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
            className="absolute z-10 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest/98 p-4 shadow-glass backdrop-blur"
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

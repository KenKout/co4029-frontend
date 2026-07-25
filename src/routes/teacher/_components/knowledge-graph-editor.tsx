import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Minus,
  RotateCcw,
  X,
  Undo2,
  Redo2,
  Save,
  Send,
  Trash2,
  Star,
  ArrowRight,
  ArrowLeftRight,
  Loader2,
  Check,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCuratedKnowledgeGraph,
  useSaveCuratedKnowledgeGraph,
  usePublishCuratedKnowledgeGraph,
} from "@/lib/api/hooks/materials";
import type {
  CuratedKGNode,
  CuratedKGEdge,
  CuratedKGRelation,
} from "@/lib/api/types";

/**
 * Full-screen teacher editor for a lesson's curated knowledge graph.
 *
 * CRUD over nodes, edges, and node detail with a hard product rule: exactly
 * ONE node is the primary (centre) node — Save is blocked otherwise. Supports
 * client-side undo/redo over an in-memory history stack (reset on load/save).
 * Save persists the draft; Publish snapshots it to the student reading view.
 *
 * Interaction parity with the read-only detail explorer is deliberate: same
 * wheel-zoom maths (zoom toward the pointer, non-passive listener so ctrl+wheel
 * can't page-zoom), same +/- / fit controls, and the same camera glide when a
 * node is selected — so switching between viewing and editing doesn't feel like
 * two different tools.
 *
 * Relationships are drawn via ARROW MODE: toggle it on, click a source node
 * then a target node. Two arrow kinds are supported (PREREQUISITE_OF and
 * RELATED_TO), chosen in the toolbar. Clicking an existing arrow selects it,
 * exposing edit (kind / direction) and delete.
 *
 * Rendering is plain SVG with a single <g> transform (translate+scale), same
 * dependency-free approach as the read-only explorer. Coordinates live in an
 * abstract "world" space that the transform maps to screen.
 */

interface Graph {
  nodes: CuratedKGNode[];
  edges: CuratedKGEdge[];
}

interface Vec {
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
// Zoom bounds mirror knowledge-graph-detail.tsx so both screens feel identical.
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
const HISTORY_CAP = 100;

// Node-type vocabulary offered by the type selector. A closed list keeps the
// graph consistent — free text produced "concept"/"Concept"/"Concepts" as three
// distinct kinds. The backend column is a plain string, so extending this list
// needs no migration, and an unrecognised legacy value falls back to the first
// entry in the picker rather than being silently dropped.
const NODE_TYPES = [
  "Concept",
  "Definition",
  "Theorem",
  "Formula",
  "Procedure",
  "Example",
  "Application",
  "Tool",
  "Person",
  "Event",
] as const;

const RELATION_KINDS: readonly CuratedKGRelation[] = [
  "PREREQUISITE_OF",
  "RELATED_TO",
];

// Deterministic radial seed layout so a freshly loaded graph has sane
// positions. The teacher can drag from here; positions are view-only (not
// persisted) — the graph's meaning is nodes+edges, not coordinates.
function seedPositions(nodes: CuratedKGNode[]): Map<string, Vec> {
  const positions = new Map<string, Vec>();
  const cx = WORLD_W / 2;
  const cy = WORLD_H / 2;
  // Primary (or first) node anchors the centre.
  const primaryIdx = Math.max(
    0,
    nodes.findIndex((n) => n.is_primary),
  );
  nodes.forEach((node, i) => {
    if (i === primaryIdx) {
      positions.set(node.id, { x: cx, y: cy });
      return;
    }
    const rank = i < primaryIdx ? i + 1 : i;
    const ring = rank <= 8 ? 1 : rank <= 24 ? 2 : 3;
    const radius = ring * Math.min(WORLD_W, WORLD_H) * 0.16;
    const angle = rank * 2.399963; // golden angle
    positions.set(node.id, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });
  return positions;
}

function radiusFor(weight: number): number {
  const w = Math.max(1, Math.min(100, weight));
  return 12 + Math.min(22, (w / 20) * 22);
}

let nodeSeq = 0;
function freshNodeId() {
  nodeSeq += 1;
  return `n_${Date.now().toString(36)}_${nodeSeq}`;
}

export function KnowledgeGraphEditor({
  lessonId,
  title,
  onClose,
}: {
  lessonId: string;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const draftQuery = useCuratedKnowledgeGraph(lessonId);
  const saveMutation = useSaveCuratedKnowledgeGraph(lessonId);
  const publishMutation = usePublishCuratedKnowledgeGraph(lessonId);

  // --- Undo/redo history over graph snapshots ------------------------------
  const [history, setHistory] = useState<Graph[]>([{ nodes: [], edges: [] }]);
  const [histIndex, setHistIndex] = useState(0);
  const graph = history[histIndex];
  const canUndo = histIndex > 0;
  const canRedo = histIndex < history.length - 1;

  // The last-saved snapshot (JSON) so we can show a dirty indicator.
  const [savedSnapshot, setSavedSnapshot] = useState<string>("[]");
  const [seededHint, setSeededHint] = useState(false);
  const initialized = useRef(false);

  const [positions, setPositions] = useState<Map<string, Vec>>(new Map());
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const [transform, setTransform] = useState<Transform>({
    tx: 0,
    ty: 0,
    scale: 1,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Arrow (edge-draw) mode. A toggle rather than a per-node action: turn it on,
  // then click a source node and a target node. Stays armed after each arrow so
  // several can be drawn in a row.
  const [arrowMode, setArrowMode] = useState(false);
  // Which arrow kind new relationships are created with while arrow mode is on.
  const [arrowRelation, setArrowRelation] =
    useState<CuratedKGRelation>("PREREQUISITE_OF");
  // Pending source node while arrow mode waits for its target.
  const [linkSource, setLinkSource] = useState<string | null>(null);
  // Currently selected relationship, enabling edit (kind/direction) + delete.
  const [selectedEdge, setSelectedEdge] = useState<{
    source: string;
    target: string;
  } | null>(null);
  // When true the world <g> animates its transform (camera glide on select),
  // then goes instant again so pan/zoom/drag stay lag-free. Same as detail view.
  const [smooth, setSmooth] = useState(false);
  const smoothTimer = useRef<number | null>(null);

  // Seed local state once the draft loads.
  useEffect(() => {
    if (initialized.current || !draftQuery.data) return;
    initialized.current = true;
    const g: Graph = {
      nodes: draftQuery.data.nodes.map((n) => ({ ...n })),
      edges: draftQuery.data.edges.map((e) => ({ ...e })),
    };
    setHistory([g]);
    setHistIndex(0);
    setSavedSnapshot(JSON.stringify(g));
    setSeededHint(draftQuery.data.seeded);
    setPositions(seedPositions(g.nodes));
  }, [draftQuery.data]);

  // Commit a new graph state onto the history stack (truncating any redo tail).
  const commit = useCallback(
    (next: Graph) => {
      setHistory((prev) => {
        const truncated = prev.slice(0, histIndex + 1);
        truncated.push(next);
        // Cap history so a long session doesn't grow unbounded.
        const capped =
          truncated.length > HISTORY_CAP
            ? truncated.slice(truncated.length - HISTORY_CAP)
            : truncated;
        return capped;
      });
      setHistIndex((i) => Math.min(i + 1, HISTORY_CAP - 1));
      // Ensure every node has a position (new nodes get one near centre).
      setPositions((prev) => {
        const nextPos = new Map(prev);
        next.nodes.forEach((n) => {
          if (!nextPos.has(n.id)) {
            nextPos.set(n.id, {
              x: WORLD_W / 2 + (Math.random() - 0.5) * 200,
              y: WORLD_H / 2 + (Math.random() - 0.5) * 200,
            });
          }
        });
        return nextPos;
      });
    },
    [histIndex],
  );

  const undo = useCallback(() => {
    setHistIndex((i) => Math.max(0, i - 1));
  }, []);
  const redo = useCallback(() => {
    setHistIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  // --- Graph mutations (each commits a new history entry) ------------------
  const primaryCount = useMemo(
    () => graph.nodes.filter((n) => n.is_primary).length,
    [graph.nodes],
  );

  const addNode = useCallback(() => {
    const id = freshNodeId();
    const isFirst = graph.nodes.length === 0;
    const node: CuratedKGNode = {
      id,
      label: t("teacher_kg_editor.new_node_label"),
      type: "Concept",
      definition: null,
      weight: 10,
      // The very first node auto-becomes primary so the graph is always valid.
      is_primary: isFirst,
    };
    commit({ nodes: [...graph.nodes, node], edges: graph.edges });
    setSelectedEdge(null);
    setSelectedId(id);
  }, [graph, commit, t]);

  const updateNode = useCallback(
    (id: string, patch: Partial<CuratedKGNode>) => {
      commit({
        nodes: graph.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        edges: graph.edges,
      });
    },
    [graph, commit],
  );

  const deleteNode = useCallback(
    (id: string) => {
      commit({
        nodes: graph.nodes.filter((n) => n.id !== id),
        edges: graph.edges.filter((e) => e.source !== id && e.target !== id),
      });
      setSelectedId((cur) => (cur === id ? null : cur));
      setLinkSource((cur) => (cur === id ? null : cur));
      // Any relationship touching the removed node is gone too.
      setSelectedEdge((cur) =>
        cur && (cur.source === id || cur.target === id) ? null : cur,
      );
    },
    [graph, commit],
  );

  const makePrimary = useCallback(
    (id: string) => {
      // Exactly one primary: set this one, clear all others.
      commit({
        nodes: graph.nodes.map((n) => ({ ...n, is_primary: n.id === id })),
        edges: graph.edges,
      });
    },
    [graph, commit],
  );

  const addEdge = useCallback(
    (source: string, target: string, relation: CuratedKGRelation) => {
      if (source === target) return;
      // De-dupe: same source+target already linked.
      if (graph.edges.some((e) => e.source === source && e.target === target)) {
        toast.info(t("teacher_kg_editor.edge_exists"));
        return;
      }
      commit({
        nodes: graph.nodes,
        edges: [...graph.edges, { source, target, relation }],
      });
    },
    [graph, commit, t],
  );

  const deleteEdge = useCallback(
    (source: string, target: string) => {
      commit({
        nodes: graph.nodes,
        edges: graph.edges.filter(
          (e) => !(e.source === source && e.target === target),
        ),
      });
      setSelectedEdge((cur) =>
        cur && cur.source === source && cur.target === target ? null : cur,
      );
    },
    [graph, commit],
  );

  /** Change an existing relationship's kind (arrow type) in place. */
  const updateEdgeRelation = useCallback(
    (source: string, target: string, relation: CuratedKGRelation) => {
      commit({
        nodes: graph.nodes,
        edges: graph.edges.map((e) =>
          e.source === source && e.target === target ? { ...e, relation } : e,
        ),
      });
    },
    [graph, commit],
  );

  /** Flip a relationship's direction (source ⇄ target). */
  const reverseEdge = useCallback(
    (source: string, target: string) => {
      // Refuse if the reversed pair already exists — that would be a duplicate.
      if (graph.edges.some((e) => e.source === target && e.target === source)) {
        toast.info(t("teacher_kg_editor.edge_exists"));
        return;
      }
      commit({
        nodes: graph.nodes,
        edges: graph.edges.map((e) =>
          e.source === source && e.target === target
            ? { ...e, source: target, target: source }
            : e,
        ),
      });
      setSelectedEdge({ source: target, target: source });
    },
    [graph, commit, t],
  );

  // --- Dirty tracking ------------------------------------------------------
  const isDirty = useMemo(
    () => JSON.stringify(graph) !== savedSnapshot,
    [graph, savedSnapshot],
  );

  const validationError = useMemo(() => {
    if (graph.nodes.length === 0) return t("teacher_kg_editor.err_no_nodes");
    if (primaryCount === 0) return t("teacher_kg_editor.err_no_primary");
    if (primaryCount > 1) return t("teacher_kg_editor.err_many_primary");
    return null;
  }, [graph.nodes.length, primaryCount, t]);

  const handleSave = useCallback(async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      await saveMutation.mutateAsync({
        nodes: graph.nodes,
        edges: graph.edges,
      });
      setSavedSnapshot(JSON.stringify(graph));
      toast.success(t("teacher_kg_editor.saved"));
    } catch (err) {
      toast.error((err as Error).message || t("teacher_kg_editor.save_failed"));
    }
  }, [validationError, saveMutation, graph, t]);

  const handlePublish = useCallback(async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      // Save first if there are unsaved edits, so publish always reflects
      // what's on screen.
      if (isDirty) {
        await saveMutation.mutateAsync({
          nodes: graph.nodes,
          edges: graph.edges,
        });
        setSavedSnapshot(JSON.stringify(graph));
      }
      await publishMutation.mutateAsync();
      toast.success(t("teacher_kg_editor.published"));
    } catch (err) {
      toast.error(
        (err as Error).message || t("teacher_kg_editor.publish_failed"),
      );
    }
  }, [validationError, isDirty, saveMutation, publishMutation, graph, t]);

  // --- Fit to view ---------------------------------------------------------
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
      const pad = 140;
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

  useEffect(() => {
    // Fit once positions are first seeded.
    if (positions.size > 0) {
      const id = requestAnimationFrame(() => fitToView());
      return () => cancelAnimationFrame(id);
    }
  }, [fitToView, initialized.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Glide the camera so a node lands in the centre of the canvas — identical to
  // the read-only detail screen's focusNode, so selecting a concept behaves the
  // same in both. Enables the transform transition for the move, then disables
  // it so subsequent pan/zoom stay instant.
  const focusNode = useCallback((nodeId: string) => {
    const svg = svgRef.current;
    const p = positionsRef.current.get(nodeId);
    if (!svg || !p) return;
    const rect = svg.getBoundingClientRect();
    setSmooth(true);
    if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
    smoothTimer.current = window.setTimeout(() => setSmooth(false), 420);
    setTransform((prev) => {
      // Ease in a little if we're very zoomed out, so the focused node is
      // comfortably readable — matches the detail screen's behaviour.
      const scale = Math.min(MAX_SCALE, Math.max(prev.scale, 0.9));
      return {
        scale,
        tx: rect.width / 2 - p.x * scale,
        ty: rect.height / 2 - p.y * scale,
      };
    });
  }, []);

  useEffect(
    () => () => {
      if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
    },
    [],
  );

  // --- Keyboard: undo/redo/escape ------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        mod &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") {
        // Unwind one layer at a time: pending arrow source → arrow mode →
        // selected edge → selected node → close the editor.
        if (linkSource) setLinkSource(null);
        else if (arrowMode) setArrowMode(false);
        else if (selectedEdge) setSelectedEdge(null);
        else if (selectedId) setSelectedId(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, onClose, linkSource, arrowMode, selectedEdge, selectedId]);

  // --- Pointer interaction (pan + node drag) -------------------------------
  const drag = useRef<{
    kind: "pan" | "node" | null;
    nodeId?: string;
    lastX: number;
    lastY: number;
    moved: boolean;
  }>({ kind: null, lastX: 0, lastY: 0, moved: false });

  const onPointerDownBg = (e: React.PointerEvent) => {
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
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) d.moved = true;
    if (d.kind === "pan") {
      setTransform((prev) => ({ ...prev, tx: prev.tx + dx, ty: prev.ty + dy }));
    } else if (d.kind === "node" && d.nodeId) {
      const id = d.nodeId;
      setPositions((prev) => {
        const next = new Map(prev);
        const p = next.get(id);
        if (p)
          next.set(id, {
            x: p.x + dx / transform.scale,
            y: p.y + dy / transform.scale,
          });
        return next;
      });
    }
    d.lastX = e.clientX;
    d.lastY = e.clientY;
  };

  const onPointerUp = () => {
    drag.current.kind = null;
  };

  const onNodeClick = (nodeId: string) => {
    if (drag.current.moved) return;
    // Arrow mode: first click arms the source, second completes the arrow with
    // the currently selected relation kind. Mode stays on for the next one.
    if (arrowMode) {
      if (!linkSource) {
        setLinkSource(nodeId);
        return;
      }
      if (linkSource !== nodeId) {
        addEdge(linkSource, nodeId, arrowRelation);
      }
      setLinkSource(null);
      return;
    }
    setSelectedEdge(null);
    setSelectedId((cur) => (cur === nodeId ? null : nodeId));
    // Parity with the detail screen: selecting a node glides the camera to it.
    focusNode(nodeId);
  };

  // Native non-passive wheel zoom (React onWheel is passive → can't
  // preventDefault, which would let ctrl+scroll zoom the browser page).
  // Identical maths to knowledge-graph-detail.tsx: zoom toward the pointer so
  // the concept under the cursor stays put.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
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

  const nodeById = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes],
  );
  const selectedNode = selectedId ? nodeById.get(selectedId) : undefined;
  const activeEdge = useMemo(
    () =>
      selectedEdge
        ? graph.edges.find(
            (e) =>
              e.source === selectedEdge.source &&
              e.target === selectedEdge.target,
          )
        : undefined,
    [selectedEdge, graph.edges],
  );

  const relationLabel = (r: CuratedKGRelation) =>
    r === "PREREQUISITE_OF"
      ? t("teacher_kg_editor.rel_prerequisite")
      : t("teacher_kg_editor.rel_related");

  const busy = saveMutation.isPending || publishMutation.isPending;

  const overlay = (
    <div className="fixed inset-0 z-50 flex flex-col bg-m3-surface">
      {/* Header / toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-m3-outline-variant/20 bg-m3-surface-container-lowest px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Pencil className="h-5 w-5 shrink-0 text-m3-secondary" />
          <h2 className="truncate font-headline font-bold text-m3-on-surface">
            {t("teacher_kg_editor.title", { lesson: title })}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={addNode}
            className="flex items-center gap-1.5 rounded-lg bg-m3-surface-container px-2.5 py-1.5 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("teacher_kg_editor.add_node")}
          </button>
          {/* Arrow mode: toggle on, then click two nodes to link them. The
              adjacent picker chooses which arrow kind gets created. */}
          <button
            type="button"
            onClick={() => {
              setArrowMode((on) => !on);
              setLinkSource(null);
            }}
            aria-pressed={arrowMode}
            title={t("teacher_kg_editor.arrow_mode")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
              arrowMode
                ? "bg-m3-primary text-white"
                : "bg-m3-surface-container text-m3-on-surface-variant hover:text-m3-primary",
            )}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {t("teacher_kg_editor.arrow_mode")}
          </button>
          {arrowMode && (
            <select
              value={arrowRelation}
              onChange={(e) =>
                setArrowRelation(e.target.value as CuratedKGRelation)
              }
              aria-label={t("teacher_kg_editor.arrow_kind")}
              className="rounded-lg border border-m3-outline-variant/30 bg-m3-surface-container-lowest px-2 py-1.5 text-xs font-semibold text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20"
            >
              {RELATION_KINDS.map((r) => (
                <option key={r} value={r}>
                  {relationLabel(r)}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label={t("teacher_kg_editor.undo")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label={t("teacher_kg_editor.redo")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <div className="mx-1 h-6 w-px bg-m3-outline-variant/30" />
          {isDirty ? (
            <span className="text-[11px] font-semibold text-amber-700">
              {t("teacher_kg_editor.unsaved")}
            </span>
          ) : draftQuery.data?.is_published ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              {t("teacher_kg_editor.published_state")}
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSave}
            disabled={busy || !!validationError || !isDirty}
            className="gap-1.5"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("teacher_kg_editor.save")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handlePublish}
            disabled={busy || !!validationError}
            className="gap-1.5 gradient-primary text-white border-0"
          >
            {publishMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {t("teacher_kg_editor.publish")}
          </Button>
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

      {/* Validation / mode banner */}
      {(validationError || arrowMode) && (
        <div
          className={cn(
            "px-4 py-2 text-xs font-semibold",
            arrowMode
              ? "bg-m3-primary/10 text-m3-primary"
              : "bg-amber-50 text-amber-800",
          )}
        >
          {arrowMode
            ? linkSource
              ? t("teacher_kg_editor.arrow_pick_target", {
                  relation: relationLabel(arrowRelation),
                })
              : t("teacher_kg_editor.arrow_pick_source")
            : validationError}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {draftQuery.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-m3-on-surface-variant">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t("common.loading")}
          </div>
        ) : (
          <svg
            ref={svgRef}
            className={cn(
              "h-full w-full touch-none select-none",
              arrowMode
                ? "cursor-crosshair"
                : drag.current.kind === "pan"
                  ? "cursor-grabbing"
                  : "cursor-grab",
            )}
            onPointerDown={(e) => {
              onPointerDownBg(e);
              // Empty-canvas click clears selection and any pending arrow
              // source (without leaving arrow mode — Esc does that).
              if (linkSource) setLinkSource(null);
              setSelectedId(null);
              setSelectedEdge(null);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            role="application"
            aria-label={t("teacher_kg_editor.canvas_label")}
          >
            <defs>
              {/* Two arrow kinds. Solid amber head + dashed line =
                  PREREQUISITE_OF (a hard dependency); open slate head + solid
                  line = RELATED_TO (a soft association). */}
              <marker
                id="kge-arrow-prereq"
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
                id="kge-arrow-related"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path
                  d="M0,1 L9,5 L0,9"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.6"
                />
              </marker>
              <marker
                id="kge-arrow-selected"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M0,1 L9,5 L0,9 z" fill="#7c3aed" />
              </marker>
            </defs>
            <g
              className={
                smooth ? "transition-transform duration-[400ms]" : undefined
              }
              transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
            >
              {/* Edges */}
              {graph.edges.map((e, i) => {
                const a = positions.get(e.source);
                const b = positions.get(e.target);
                if (!a || !b) return null;
                const isPrereq = e.relation === "PREREQUISITE_OF";
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len;
                const uy = dy / len;
                const ra = radiusFor(nodeById.get(e.source)?.weight ?? 1);
                const rb = radiusFor(nodeById.get(e.target)?.weight ?? 1);
                const x1 = a.x + ux * (ra + 3);
                const y1 = a.y + uy * (ra + 3);
                const x2 = b.x - ux * (rb + 7);
                const y2 = b.y - uy * (rb + 7);
                const mx = (x1 + x2) / 2;
                const my = (y1 + y2) / 2;
                const isEdgeSelected =
                  !!selectedEdge &&
                  selectedEdge.source === e.source &&
                  selectedEdge.target === e.target;
                return (
                  <g key={`${e.source}->${e.target}-${i}`}>
                    {/* Invisible fat hit-line: the drawn arrow is only ~1.5px,
                        far too thin to click reliably when zoomed out. */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="transparent"
                      strokeWidth={14}
                      className="cursor-pointer"
                      onPointerDown={(ev) => ev.stopPropagation()}
                      onPointerUp={(ev) => {
                        ev.stopPropagation();
                        // In arrow mode clicks belong to node linking, not
                        // selection.
                        if (arrowMode) return;
                        setSelectedId(null);
                        setSelectedEdge((cur) =>
                          cur &&
                          cur.source === e.source &&
                          cur.target === e.target
                            ? null
                            : { source: e.source, target: e.target },
                        );
                      }}
                    />
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={
                        isEdgeSelected
                          ? "#7c3aed"
                          : isPrereq
                            ? "#d97706"
                            : "#94a3b8"
                      }
                      strokeWidth={isEdgeSelected ? 3 : 1.5}
                      strokeDasharray={isPrereq ? "6 4" : undefined}
                      markerEnd={
                        isEdgeSelected
                          ? "url(#kge-arrow-selected)"
                          : isPrereq
                            ? "url(#kge-arrow-prereq)"
                            : "url(#kge-arrow-related)"
                      }
                      className="pointer-events-none"
                    />
                    {isEdgeSelected && (
                      <circle
                        cx={mx}
                        cy={my}
                        r={4}
                        fill="#7c3aed"
                        className="pointer-events-none"
                      />
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {graph.nodes.map((n) => {
                const p = positions.get(n.id);
                if (!p) return null;
                const r = radiusFor(n.weight);
                const isSelected = selectedId === n.id;
                const isLinkSrc = linkSource === n.id;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x} ${p.y})`}
                    className="cursor-pointer"
                    onPointerDown={(e) => onPointerDownNode(e, n.id)}
                    onPointerUp={() => onNodeClick(n.id)}
                  >
                    {(isSelected || isLinkSrc || n.is_primary) && (
                      <circle
                        r={r + 7}
                        fill="none"
                        stroke={
                          isLinkSrc
                            ? "#7c3aed"
                            : n.is_primary
                              ? "#f59e0b"
                              : "#3b82f6"
                        }
                        strokeWidth={2.5}
                        opacity={0.5}
                      />
                    )}
                    <circle
                      r={r}
                      fill={n.is_primary ? "#1e40af" : "#dbeafe"}
                      stroke={n.is_primary ? "#1e3a8a" : "#3b82f6"}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                    {n.is_primary && (
                      <Star
                        x={-6}
                        y={-6}
                        width={12}
                        height={12}
                        className="fill-amber-300 text-amber-300"
                      />
                    )}
                    <text
                      y={r + 14}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={n.is_primary ? 700 : 600}
                      className="pointer-events-none fill-m3-on-surface"
                    >
                      {n.label.length > 28
                        ? `${n.label.slice(0, 27)}…`
                        : n.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Zoom controls */}
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

        {/* Selected-relationship editor (arrow kind / direction / delete) */}
        {activeEdge && selectedEdge && (
          <div className="absolute top-4 right-4 w-80 max-w-[calc(100%-2rem)] rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest/98 p-4 shadow-glass backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-headline font-bold text-m3-on-surface">
                {t("teacher_kg_editor.edge_detail")}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedEdge(null)}
                aria-label={t("common.close")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-m3-surface-container-high"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Which two concepts this arrow connects, in direction order. */}
              <div className="flex items-center gap-2 rounded-lg bg-m3-surface-container-low px-2.5 py-2 text-xs">
                <span className="truncate font-semibold text-m3-on-surface">
                  {nodeById.get(activeEdge.source)?.label ?? activeEdge.source}
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-m3-on-surface-variant" />
                <span className="truncate font-semibold text-m3-on-surface">
                  {nodeById.get(activeEdge.target)?.label ?? activeEdge.target}
                </span>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="kge-edge-kind"
                  className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant"
                >
                  {t("teacher_kg_editor.arrow_kind")}
                </label>
                <select
                  id="kge-edge-kind"
                  value={activeEdge.relation}
                  onChange={(ev) =>
                    updateEdgeRelation(
                      activeEdge.source,
                      activeEdge.target,
                      ev.target.value as CuratedKGRelation,
                    )
                  }
                  className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20"
                >
                  {RELATION_KINDS.map((r) => (
                    <option key={r} value={r}>
                      {relationLabel(r)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    reverseEdge(activeEdge.source, activeEdge.target)
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-m3-surface-container px-2.5 py-1.5 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-primary"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {t("teacher_kg_editor.reverse_arrow")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteEdge(activeEdge.source, activeEdge.target)
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("teacher_kg_editor.delete_arrow")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Selected-node detail editor */}
        {selectedNode && !activeEdge && (
          <div className="absolute top-4 right-4 w-80 max-w-[calc(100%-2rem)] rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest/98 p-4 shadow-glass backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-headline font-bold text-m3-on-surface">
                {t("teacher_kg_editor.node_detail")}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label={t("common.close")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-m3-surface-container-high"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_kg_editor.field_label")}
                </label>
                <Input
                  value={selectedNode.label}
                  onChange={(e) =>
                    updateNode(selectedNode.id, { label: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="kge-node-type"
                  className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant"
                >
                  {t("teacher_kg_editor.field_type")}
                </label>
                <select
                  id="kge-node-type"
                  value={
                    (NODE_TYPES as readonly string[]).includes(
                      selectedNode.type,
                    )
                      ? selectedNode.type
                      : NODE_TYPES[0]
                  }
                  onChange={(e) =>
                    updateNode(selectedNode.id, { type: e.target.value })
                  }
                  className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20"
                >
                  {NODE_TYPES.map((nt) => (
                    <option key={nt} value={nt}>
                      {nt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_kg_editor.field_definition")}
                </label>
                <textarea
                  value={selectedNode.definition ?? ""}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      definition: e.target.value || null,
                    })
                  }
                  rows={3}
                  className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-secondary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_kg_editor.field_weight")} ({selectedNode.weight})
                </label>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={selectedNode.weight}
                  onChange={(e) =>
                    updateNode(selectedNode.id, {
                      weight: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => makePrimary(selectedNode.id)}
                  disabled={selectedNode.is_primary}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                    selectedNode.is_primary
                      ? "bg-amber-100 text-amber-800"
                      : "bg-m3-surface-container text-m3-on-surface-variant hover:text-amber-700",
                  )}
                >
                  <Star className="h-3.5 w-3.5" />
                  {selectedNode.is_primary
                    ? t("teacher_kg_editor.is_primary")
                    : t("teacher_kg_editor.make_primary")}
                </button>
                <button
                  type="button"
                  onClick={() => deleteNode(selectedNode.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("teacher_kg_editor.delete_node")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Seeded-from-AI hint */}
        {seededHint && !draftQuery.data?.exists && (
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-xl border border-m3-outline-variant/20 bg-m3-surface/90 px-3 py-2 text-[11px] italic text-m3-on-surface-variant shadow-sm backdrop-blur">
            {t("teacher_kg_editor.seeded_hint")}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export default KnowledgeGraphEditor;

import { useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import type { CuratedKGRelation } from "@/lib/api/types";

import type { EdgeRef, Graph, Transform, Vec } from "./types";

/**
 * Every piece of `useState`/`useRef` the editor owns, in the exact order the
 * former single-file component declared them. Grouped into cohesive bundles
 * (history, positions, camera, selection, animation) so the action hooks can
 * take one object instead of a dozen setters — but the underlying primitive
 * hook call sequence is unchanged, which is what React's hook ordering cares
 * about.
 */

export interface HistoryState {
  history: Graph[];
  setHistory: Dispatch<SetStateAction<Graph[]>>;
  histIndex: number;
  setHistIndex: Dispatch<SetStateAction<number>>;
  savedSnapshot: string;
  setSavedSnapshot: Dispatch<SetStateAction<string>>;
  seededHint: boolean;
  setSeededHint: Dispatch<SetStateAction<boolean>>;
  /** True once the loaded draft has been copied into the history stack. */
  isInitialized: () => boolean;
  markInitialized: () => void;
}

export interface PositionsState {
  positions: Map<string, Vec>;
  setPositions: Dispatch<SetStateAction<Map<string, Vec>>>;
  positionsRef: RefObject<Map<string, Vec>>;
}

export interface CameraState {
  transform: Transform;
  setTransform: Dispatch<SetStateAction<Transform>>;
}

export interface SelectionState {
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  arrowMode: boolean;
  setArrowMode: Dispatch<SetStateAction<boolean>>;
  arrowRelation: CuratedKGRelation;
  setArrowRelation: Dispatch<SetStateAction<CuratedKGRelation>>;
  linkSource: string | null;
  setLinkSource: Dispatch<SetStateAction<string | null>>;
  selectedEdge: EdgeRef | null;
  setSelectedEdge: Dispatch<SetStateAction<EdgeRef | null>>;
}

export interface SmoothState {
  smooth: boolean;
  setSmooth: Dispatch<SetStateAction<boolean>>;
  /** Cancel a pending "stop gliding" timer without touching `smooth`. */
  clearSmoothTimer: () => void;
  /** Start gliding now and go instant again after `ms`. */
  beginSmooth: (ms: number) => void;
}

export interface EditorState {
  hist: HistoryState;
  pos: PositionsState;
  camera: CameraState;
  sel: SelectionState;
  anim: SmoothState;
  graph: Graph;
  canUndo: boolean;
  canRedo: boolean;
}

function useHistoryState(): HistoryState {
  // --- Undo/redo history over graph snapshots ------------------------------
  const [history, setHistory] = useState<Graph[]>([{ nodes: [], edges: [] }]);
  const [histIndex, setHistIndex] = useState(0);

  // The last-saved snapshot (JSON) so we can show a dirty indicator.
  const [savedSnapshot, setSavedSnapshot] = useState<string>("[]");
  const [seededHint, setSeededHint] = useState(false);
  const initialized = useRef(false);

  return {
    history,
    setHistory,
    histIndex,
    setHistIndex,
    savedSnapshot,
    setSavedSnapshot,
    seededHint,
    setSeededHint,
    isInitialized: () => initialized.current,
    markInitialized: () => {
      initialized.current = true;
    },
  };
}

function usePositionsState(): PositionsState {
  const [positions, setPositions] = useState<Map<string, Vec>>(new Map());
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  return { positions, setPositions, positionsRef };
}

function useCameraState(): CameraState {
  const [transform, setTransform] = useState<Transform>({
    tx: 0,
    ty: 0,
    scale: 1,
  });
  return { transform, setTransform };
}

function useSelectionState(): SelectionState {
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
  const [selectedEdge, setSelectedEdge] = useState<EdgeRef | null>(null);
  return {
    selectedId,
    setSelectedId,
    arrowMode,
    setArrowMode,
    arrowRelation,
    setArrowRelation,
    linkSource,
    setLinkSource,
    selectedEdge,
    setSelectedEdge,
  };
}

function useSmoothState(): SmoothState {
  // When true the world <g> animates its transform (camera glide on select),
  // then goes instant again so pan/zoom/drag stay lag-free. Same as detail view.
  const [smooth, setSmooth] = useState(false);
  const smoothTimer = useRef<number | null>(null);
  const clearSmoothTimer = () => {
    if (smoothTimer.current) window.clearTimeout(smoothTimer.current);
  };
  const beginSmooth = (ms: number) => {
    setSmooth(true);
    clearSmoothTimer();
    smoothTimer.current = window.setTimeout(() => setSmooth(false), ms);
  };
  return { smooth, setSmooth, clearSmoothTimer, beginSmooth };
}

export function useEditorState(): EditorState {
  const hist = useHistoryState();
  const pos = usePositionsState();
  const camera = useCameraState();
  const sel = useSelectionState();
  const anim = useSmoothState();

  const graph = hist.history[hist.histIndex];
  const canUndo = hist.histIndex > 0;
  const canRedo = hist.histIndex < hist.history.length - 1;

  return { hist, pos, camera, sel, anim, graph, canUndo, canRedo };
}

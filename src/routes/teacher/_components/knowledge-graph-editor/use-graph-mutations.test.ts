import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGraphMutations } from "./use-graph-mutations";
import type { EditorState } from "./use-editor-state";
import type { Graph, TranslateFn } from "./types";

const t = ((key: string, opts?: Record<string, unknown>) => {
  const base =
    key === "teacher_kg_editor.new_node_label"
      ? "New concept"
      : "New concept {{n}}";
  return opts ? base.replace("{{n}}", String(opts.n)) : base;
}) as TranslateFn;

function stateWith(graph: Graph): EditorState {
  return {
    graph,
    hist: { index: 0, stack: [graph] },
    pos: { byId: {} },
    camera: { tx: 0, ty: 0, zoom: 1 },
    sel: {
      nodeId: null,
      edgeIds: [],
      setSelectedEdge: () => {},
      setSelectedId: () => {},
    },
    anim: { phase: "idle" },
    canUndo: false,
    canRedo: false,
  } as unknown as EditorState;
}

/** Renders the mutations hook against live state so addNode sees commits. */
function useHarness(initial: Graph) {
  const [graph, setGraph] = useState<Graph>(initial);
  const mutations = useGraphMutations({
    state: stateWith(graph),
    commit: setGraph,
    t,
  });
  return { mutations, graph };
}

describe("useGraphMutations addNode default names", () => {
  it("indexes every auto-created node", () => {
    const { result } = renderHook(() => useHarness({ nodes: [], edges: [] }));
    act(() => result.current.mutations.addNode());
    expect(result.current.graph.nodes.map((n) => n.label)).toEqual([
      "New concept 1",
    ]);
    act(() => result.current.mutations.addNode());
    expect(result.current.graph.nodes.map((n) => n.label)).toEqual([
      "New concept 1",
      "New concept 2",
    ]);
  });

  it("skips past existing names instead of reusing their index", () => {
    const graph: Graph = {
      nodes: [
        {
          id: "a",
          label: "New concept 1",
          type: "Concept",
          definition: null,
          weight: 10,
          is_primary: true,
        },
      ],
      edges: [],
    };
    const { result } = renderHook(() => useHarness(graph));
    act(() => result.current.mutations.addNode());
    expect(result.current.graph.nodes.map((n) => n.label)).toEqual([
      "New concept 1",
      "New concept 2",
    ]);
  });

  it("does not collide with a legacy unnumbered default node", () => {
    const graph: Graph = {
      nodes: [
        {
          id: "a",
          label: "New concept",
          type: "Concept",
          definition: null,
          weight: 10,
          is_primary: true,
        },
      ],
      edges: [],
    };
    const { result } = renderHook(() => useHarness(graph));
    act(() => result.current.mutations.addNode());
    expect(result.current.graph.nodes.map((n) => n.label)).toEqual([
      "New concept",
      "New concept 1",
    ]);
  });

  it("continues past a gap after a node was deleted", () => {
    const graph: Graph = {
      nodes: [
        {
          id: "a",
          label: "New concept 1",
          type: "Concept",
          definition: null,
          weight: 10,
          is_primary: true,
        },
        {
          id: "b",
          label: "New concept 3",
          type: "Concept",
          definition: null,
          weight: 10,
          is_primary: false,
        },
      ],
      edges: [],
    };
    const { result } = renderHook(() => useHarness(graph));
    act(() => result.current.mutations.addNode());
    // Gap at 2 but 3 already exists — next must be 4, never a duplicate.
    expect(result.current.graph.nodes.map((n) => n.label)).toEqual([
      "New concept 1",
      "New concept 3",
      "New concept 4",
    ]);
  });
});
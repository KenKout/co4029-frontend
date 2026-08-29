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

describe("useGraphMutations addNode default names", () => {
  it("indexes every auto-created node", () => {
    let state = stateWith({ nodes: [], edges: [] });
    let labels: string[] = [];
    const { result, rerender } = renderHook(() =>
      useGraphMutations({
        state,
        commit: (next) => {
          labels = next.nodes.map((n) => n.label);
        },
        t,
      }),
    );

    act(() => result.current.addNode());
    rerender();
    state = stateWith({
      nodes: labels.map((label, i) => ({
        id: `n${i}`,
        label,
        type: "Concept",
        definition: null,
        weight: 10,
        is_primary: i === 0,
      })),
      edges: [],
    });
    expect(labels).toEqual(["New concept 1"]);

    act(() => result.current.addNode());
    expect(labels).toEqual(["New concept 1", "New concept 2"]);
  });

  it("skips past deleted nodes instead of reusing their index", () => {
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
    let labels: string[] = [];
    const { result } = renderHook(() =>
      useGraphMutations({
        state: stateWith(graph),
        commit: (next) => {
          labels = next.nodes.map((n) => n.label);
        },
        t,
      }),
    );
    act(() => result.current.addNode());
    // "New concept 1" exists → next is 2, not another "New concept 1".
    expect(labels).toEqual(["New concept 1", "New concept 2"]);
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
    let labels: string[] = [];
    const { result } = renderHook(() =>
      useGraphMutations({
        state: stateWith(graph),
        commit: (next) => {
          labels = next.nodes.map((n) => n.label);
        },
        t,
      }),
    );
    act(() => result.current.addNode());
    expect(labels).toEqual(["New concept", "New concept 1"]);
  });
});
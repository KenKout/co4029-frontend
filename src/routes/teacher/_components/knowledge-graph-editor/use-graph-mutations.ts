import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import type { CuratedKGNode, CuratedKGRelation } from "@/lib/api/types";

import { freshNodeId } from "./helpers";
import type { EditorState } from "./use-editor-state";
import type { Graph, TranslateFn } from "./types";

export interface GraphMutations {
  primaryCount: number;
  addNode: () => void;
  updateNode: (id: string, patch: Partial<CuratedKGNode>) => void;
  deleteNode: (id: string) => void;
  makePrimary: (id: string) => void;
  addEdge: (
    source: string,
    target: string,
    relation: CuratedKGRelation,
  ) => void;
  deleteEdge: (source: string, target: string) => void;
  updateEdgeRelation: (
    source: string,
    target: string,
    relation: CuratedKGRelation,
  ) => void;
  reverseEdge: (source: string, target: string) => void;
}

/**
 * Every node/edge mutation, each committing exactly one new history entry.
 * Extracted verbatim from the former single-file editor — same dependency
 * arrays, same selection side effects, same duplicate-arrow toasts.
 */
export function useGraphMutations(options: {
  state: EditorState;
  commit: (next: Graph) => void;
  t: TranslateFn;
}): GraphMutations {
  const { state, commit, t } = options;
  const { graph, sel } = state;

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
    sel.setSelectedEdge(null);
    sel.setSelectedId(id);
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
      sel.setSelectedId((cur) => (cur === id ? null : cur));
      sel.setLinkSource((cur) => (cur === id ? null : cur));
      // Any relationship touching the removed node is gone too.
      sel.setSelectedEdge((cur) =>
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
      sel.setSelectedEdge((cur) =>
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
      sel.setSelectedEdge({ source: target, target: source });
    },
    [graph, commit, t],
  );

  return {
    primaryCount,
    addNode,
    updateNode,
    deleteNode,
    makePrimary,
    addEdge,
    deleteEdge,
    updateEdgeRelation,
    reverseEdge,
  };
}

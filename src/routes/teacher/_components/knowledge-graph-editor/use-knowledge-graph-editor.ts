import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import {
  useCuratedKnowledgeGraph,
  useSaveCuratedKnowledgeGraph,
  usePublishCuratedKnowledgeGraph,
} from "@/lib/api/hooks/materials";

import { useEditorKeyboard } from "./use-editor-keyboard";
import { useEditorState } from "./use-editor-state";
import { useGraphCamera } from "./use-graph-camera";
import { useGraphHistoryActions } from "./use-graph-history-actions";
import { useGraphMutations } from "./use-graph-mutations";
import { useGraphPersistence } from "./use-graph-persistence";
import { useGraphPointer } from "./use-graph-pointer";

/**
 * The whole editor controller in one hook, composed from the focused hooks in
 * this folder. Sub-hooks are called in exactly the order the former single-file
 * component declared their contents, so React sees an unchanged hook sequence.
 */
export function useKnowledgeGraphEditor(options: {
  lessonId: string;
  onClose: () => void;
}) {
  const { lessonId, onClose } = options;
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const draftQuery = useCuratedKnowledgeGraph(lessonId);
  const saveMutation = useSaveCuratedKnowledgeGraph(lessonId);
  const publishMutation = usePublishCuratedKnowledgeGraph(lessonId);

  const state = useEditorState();
  const { commit, undo, redo } = useGraphHistoryActions({
    state,
    draft: draftQuery.data,
  });
  const mutations = useGraphMutations({ state, commit, t });
  const persistence = useGraphPersistence({
    state,
    primaryCount: mutations.primaryCount,
    saveMutation,
    publishMutation,
    t,
    onClose,
  });
  const camera = useGraphCamera({ state, svgRef });
  useEditorKeyboard({
    state,
    undo,
    redo,
    requestClose: persistence.requestClose,
  });
  const pointer = useGraphPointer({
    state,
    svgRef,
    addEdge: mutations.addEdge,
    focusNode: camera.focusNode,
  });

  const { graph } = state;
  const { selectedId, selectedEdge } = state.sel;
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

  const busy = saveMutation.isPending || publishMutation.isPending;

  return {
    svgRef,
    draftQuery,
    saveMutation,
    publishMutation,
    state,
    undo,
    redo,
    mutations,
    persistence,
    camera,
    pointer,
    nodeById,
    selectedNode,
    activeEdge,
    busy,
  };
}

export type KnowledgeGraphEditorController = ReturnType<
  typeof useKnowledgeGraphEditor
>;

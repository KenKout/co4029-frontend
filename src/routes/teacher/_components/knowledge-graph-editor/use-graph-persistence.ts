import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import type { UnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";

import type { EditorState } from "./use-editor-state";
import type {
  PublishGraphMutation,
  SaveGraphMutation,
  TranslateFn,
} from "./types";

export interface GraphPersistence {
  isDirty: boolean;
  closeGuard: UnsavedChangesGuard;
  requestClose: () => void;
  validationError: string | null;
  handleSave: () => Promise<void>;
  handlePublish: () => Promise<void>;
}

/**
 * Dirty tracking, the exactly-one-primary validation gate, and the save /
 * publish handlers. Publish saves first when dirty so what ships is always what
 * is on screen.
 */
export function useGraphPersistence(options: {
  state: EditorState;
  primaryCount: number;
  saveMutation: SaveGraphMutation;
  publishMutation: PublishGraphMutation;
  t: TranslateFn;
  onClose: () => void;
}): GraphPersistence {
  const { state, primaryCount, saveMutation, publishMutation, t, onClose } =
    options;
  const { graph, hist } = state;

  // --- Dirty tracking ------------------------------------------------------
  const isDirty = useMemo(
    () => JSON.stringify(graph) !== hist.savedSnapshot,
    [graph, hist.savedSnapshot],
  );

  // Guard both close paths (the X button and the Escape unwind). The editor
  // holds its whole graph in an in-memory history stack, so closing while dirty
  // discards every edit since the last save.
  const closeGuard = useUnsavedChangesGuard(isDirty);
  const requestClose = useCallback(
    () => closeGuard.run(onClose),
    [closeGuard, onClose],
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
      hist.setSavedSnapshot(JSON.stringify(graph));
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
        hist.setSavedSnapshot(JSON.stringify(graph));
      }
      await publishMutation.mutateAsync();
      toast.success(t("teacher_kg_editor.published"));
    } catch (err) {
      toast.error(
        (err as Error).message || t("teacher_kg_editor.publish_failed"),
      );
    }
  }, [validationError, isDirty, saveMutation, publishMutation, graph, t]);

  return {
    isDirty,
    closeGuard,
    requestClose,
    validationError,
    handleSave,
    handlePublish,
  };
}

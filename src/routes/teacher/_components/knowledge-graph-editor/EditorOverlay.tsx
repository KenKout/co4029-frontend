import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { EdgeInspector } from "./EdgeInspector";
import { EditorBanner } from "./EditorBanner";
import { EditorToolbar } from "./EditorToolbar";
import { GraphCanvas } from "./GraphCanvas";
import { NodeInspector } from "./NodeInspector";
import { ZoomControls } from "./ZoomControls";
import type { KnowledgeGraphEditorController } from "./use-knowledge-graph-editor";

/**
 * Full-screen overlay layout: toolbar, banner, canvas, zoom cluster and the two
 * mutually exclusive inspector panels. Composition only — every piece of state
 * lives in the controller.
 */
export function EditorOverlay({
  editor,
  title,
}: {
  editor: KnowledgeGraphEditorController;
  title: string;
}) {
  const { t } = useTranslation();
  const { state, draftQuery, persistence, camera, pointer } = editor;
  const { activeEdge, selectedNode } = editor;
  const { arrowMode, linkSource, arrowRelation, selectedEdge } = state.sel;
  const { validationError, closeGuard } = persistence;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-m3-surface">
      {/* Header / toolbar */}
      <EditorToolbar editor={editor} title={title} />

      {/* Validation / mode banner */}
      {(validationError || arrowMode) && (
        <EditorBanner
          arrowMode={arrowMode}
          linkSource={linkSource}
          arrowRelation={arrowRelation}
          validationError={validationError}
        />
      )}

      <div className="relative flex-1 overflow-hidden">
        {draftQuery.isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-m3-on-surface-variant">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t("common.loading")}
          </div>
        ) : (
          <GraphCanvas editor={editor} />
        )}

        {/* Zoom controls */}
        <ZoomControls zoomBy={pointer.zoomBy} fitToView={camera.fitToView} />

        {/* Selected-relationship editor (arrow kind / direction / delete) */}
        {activeEdge && selectedEdge && (
          <EdgeInspector editor={editor} activeEdge={activeEdge} />
        )}

        {/* Selected-node detail editor */}
        {selectedNode && !activeEdge && (
          <NodeInspector editor={editor} selectedNode={selectedNode} />
        )}

        {/* Seeded-from-AI hint */}
        {state.hist.seededHint && !draftQuery.data?.exists && (
          <div className="pointer-events-none absolute bottom-4 left-4 max-w-xs rounded-xl border border-m3-outline-variant/20 bg-m3-surface/90 px-3 py-2 text-[11px] italic text-m3-on-surface-variant shadow-sm backdrop-blur">
            {t("teacher_kg_editor.seeded_hint")}
          </div>
        )}

        {/* Unsaved-changes confirmation for the X / Escape close paths. Lives
            inside the portal so it stacks above this full-screen overlay. */}
        {closeGuard.dialog}
      </div>
    </div>
  );
}

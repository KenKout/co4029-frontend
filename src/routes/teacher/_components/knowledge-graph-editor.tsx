import { createPortal } from "react-dom";

import { EditorOverlay } from "./knowledge-graph-editor/EditorOverlay";
import { useKnowledgeGraphEditor } from "./knowledge-graph-editor/use-knowledge-graph-editor";

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
 *
 * This module is now a thin orchestrator: all state lives in
 * `./knowledge-graph-editor/use-knowledge-graph-editor`, and the surface is
 * composed from the presentational components in that same folder.
 */
export function KnowledgeGraphEditor({
  lessonId,
  title,
  onClose,
}: {
  lessonId: string;
  title: string;
  onClose: () => void;
}) {
  const editor = useKnowledgeGraphEditor({ lessonId, onClose });

  const overlay = <EditorOverlay editor={editor} title={title} />;

  return createPortal(overlay, document.body);
}

export default KnowledgeGraphEditor;

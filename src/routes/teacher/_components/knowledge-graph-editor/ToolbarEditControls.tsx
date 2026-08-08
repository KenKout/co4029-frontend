import { useTranslation } from "react-i18next";
import { Plus, ArrowRight, Undo2, Redo2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import type { CuratedKGRelation } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

import { RELATION_KINDS } from "./constants";
import { relationLabel } from "./helpers";
import type { KnowledgeGraphEditorController } from "./use-knowledge-graph-editor";

/**
 * Left half of the toolbar's action cluster: add node, arrow mode (plus the
 * picker for which arrow kind gets created), undo and redo. Rendered as a
 * fragment so the surrounding flex row is unchanged.
 */
export function ToolbarEditControls({
  editor,
}: {
  editor: KnowledgeGraphEditorController;
}) {
  const { t } = useTranslation();
  const { state, mutations, undo, redo } = editor;
  const { sel, canUndo, canRedo } = state;
  const { arrowMode, arrowRelation } = sel;

  return (
    <>
      <Button variant="ghost"
        type="button"
        onClick={mutations.addNode}
        className="flex items-center gap-1.5 rounded-lg bg-m3-surface-container px-2.5 py-1.5 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-primary h-auto whitespace-normal"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("teacher_kg_editor.add_node")}
      </Button>
      {/* Arrow mode: toggle on, then click two nodes to link them. The
          adjacent picker chooses which arrow kind gets created. */}
      <Button variant="ghost"
        type="button"
        onClick={() => {
          sel.setArrowMode((on) => !on);
          sel.setLinkSource(null);
        }}
        aria-pressed={arrowMode}
        title={t("teacher_kg_editor.arrow_mode")}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors h-auto whitespace-normal",
          arrowMode
            ? "bg-m3-primary text-white"
            : "bg-m3-surface-container text-m3-on-surface-variant hover:text-m3-primary",
        )}
      >
        <ArrowRight className="h-3.5 w-3.5" />
        {t("teacher_kg_editor.arrow_mode")}
      </Button>
      {arrowMode && (
        <Select<CuratedKGRelation>
          size="sm"
          aria-label={t("teacher_kg_editor.arrow_kind")}
          value={arrowRelation}
          onValueChange={sel.setArrowRelation}
          options={RELATION_KINDS.map((r) => ({
            value: r,
            label: relationLabel(t, r),
          }))}
          className="w-auto bg-m3-surface-container-lowest font-semibold"
        />
      )}
      <Button variant="ghost"
        type="button"
        onClick={undo}
        disabled={!canUndo}
        aria-label={t("teacher_kg_editor.undo")}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high disabled:opacity-30"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost"
        type="button"
        onClick={redo}
        disabled={!canRedo}
        aria-label={t("teacher_kg_editor.redo")}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high disabled:opacity-30"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </>
  );
}

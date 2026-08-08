import { useTranslation } from "react-i18next";
import { X, Trash2, ArrowRight, ArrowLeftRight } from "lucide-react";

import { Select } from "@/components/ui/select";
import type { CuratedKGEdge, CuratedKGRelation } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

import { RELATION_KINDS } from "./constants";
import { relationLabel } from "./helpers";
import type { KnowledgeGraphEditorController } from "./use-knowledge-graph-editor";

/** Selected-relationship editor (arrow kind / direction / delete). */
export function EdgeInspector({
  editor,
  activeEdge,
}: {
  editor: KnowledgeGraphEditorController;
  activeEdge: CuratedKGEdge;
}) {
  const { t } = useTranslation();
  const { state, mutations, nodeById } = editor;
  const { sel } = state;
  const { updateEdgeRelation, reverseEdge, deleteEdge } = mutations;

  return (
    <div className="absolute top-4 right-4 w-80 max-w-[calc(100%-2rem)] rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest/98 p-4 shadow-glass backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-headline font-bold text-m3-on-surface">
          {t("teacher_kg_editor.edge_detail")}
        </h3>
        <Button variant="ghost"
          type="button"
          onClick={() => sel.setSelectedEdge(null)}
          aria-label={t("common.close")}
          className="flex h-7 w-7 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-m3-surface-container-high"
        >
          <X className="h-4 w-4" />
        </Button>
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
          <Select<CuratedKGRelation>
            id="kge-edge-kind"
            value={activeEdge.relation}
            onValueChange={(next) =>
              updateEdgeRelation(activeEdge.source, activeEdge.target, next)
            }
            options={RELATION_KINDS.map((r) => ({
              value: r,
              label: relationLabel(t, r),
            }))}
            className="bg-m3-surface-container-lowest"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="ghost"
            type="button"
            onClick={() => reverseEdge(activeEdge.source, activeEdge.target)}
            className="flex items-center gap-1.5 rounded-lg bg-m3-surface-container px-2.5 py-1.5 text-xs font-semibold text-m3-on-surface-variant hover:text-m3-primary h-auto whitespace-normal"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {t("teacher_kg_editor.reverse_arrow")}
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => deleteEdge(activeEdge.source, activeEdge.target)}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 h-auto whitespace-normal"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("teacher_kg_editor.delete_arrow")}
          </Button>
        </div>
      </div>
    </div>
  );
}

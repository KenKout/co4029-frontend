import { useTranslation } from "react-i18next";
import { X, Trash2, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { CuratedKGNode } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { NODE_TYPES } from "./constants";
import type { KnowledgeGraphEditorController } from "./use-knowledge-graph-editor";

/** Selected-node detail editor: label, type, definition, weight and actions. */
export function NodeInspector({
  editor,
  selectedNode,
}: {
  editor: KnowledgeGraphEditorController;
  selectedNode: CuratedKGNode;
}) {
  const { t } = useTranslation();
  const { state, mutations } = editor;
  const { sel } = state;
  const { updateNode, makePrimary, deleteNode } = mutations;

  return (
    <div className="absolute top-4 right-4 w-80 max-w-[calc(100%-2rem)] rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest/98 p-4 shadow-glass backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-headline font-bold text-m3-on-surface">
          {t("teacher_kg_editor.node_detail")}
        </h3>
        <Button variant="ghost"
          type="button"
          onClick={() => sel.setSelectedId(null)}
          aria-label={t("common.close")}
          className="flex h-7 w-7 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-m3-surface-container-high"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_kg_editor.field_label")}
          </label>
          <Input
            value={selectedNode.label}
            onChange={(e) =>
              updateNode(selectedNode.id, { label: e.target.value })
            }
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="kge-node-type"
            className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant"
          >
            {t("teacher_kg_editor.field_type")}
          </label>
          <Select
            id="kge-node-type"
            value={
              (NODE_TYPES as readonly string[]).includes(selectedNode.type)
                ? selectedNode.type
                : NODE_TYPES[0]
            }
            onValueChange={(next) =>
              updateNode(selectedNode.id, { type: next })
            }
            options={NODE_TYPES.map((nt) => ({
              value: nt,
              label: nt,
            }))}
            className="bg-m3-surface-container-lowest"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_kg_editor.field_definition")}
          </label>
          <Textarea
            value={selectedNode.definition ?? ""}
            onChange={(e) =>
              updateNode(selectedNode.id, {
                definition: e.target.value || null,
              })
            }
            rows={3}
            variant="lowest"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_kg_editor.field_weight")} ({selectedNode.weight})
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={selectedNode.weight}
            onChange={(e) =>
              updateNode(selectedNode.id, {
                weight: Number(e.target.value),
              })
            }
            className="w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="ghost"
            type="button"
            onClick={() => makePrimary(selectedNode.id)}
            disabled={selectedNode.is_primary}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold h-auto whitespace-normal",
              selectedNode.is_primary
                ? "bg-amber-100 text-amber-800"
                : "bg-m3-surface-container text-m3-on-surface-variant hover:text-amber-700",
            )}
          >
            <Star className="h-3.5 w-3.5" />
            {selectedNode.is_primary
              ? t("teacher_kg_editor.is_primary")
              : t("teacher_kg_editor.make_primary")}
          </Button>
          <Button variant="ghost"
            type="button"
            onClick={() => deleteNode(selectedNode.id)}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 h-auto whitespace-normal"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("teacher_kg_editor.delete_node")}
          </Button>
        </div>
      </div>
    </div>
  );
}

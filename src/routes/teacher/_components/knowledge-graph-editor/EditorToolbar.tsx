import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";

import { ToolbarEditControls } from "./ToolbarEditControls";
import { ToolbarSaveControls } from "./ToolbarSaveControls";
import type { KnowledgeGraphEditorController } from "./use-knowledge-graph-editor";

/** Header / toolbar: lesson title on the left, every editor action on the right. */
export function EditorToolbar({
  editor,
  title,
}: {
  editor: KnowledgeGraphEditorController;
  title: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-m3-outline-variant/20 bg-m3-surface-container-lowest px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Pencil className="h-5 w-5 shrink-0 text-m3-secondary" />
        <h2 className="truncate font-headline font-bold text-m3-on-surface">
          {t("teacher_kg_editor.title", { lesson: title })}
        </h2>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <ToolbarEditControls editor={editor} />
        <ToolbarSaveControls editor={editor} />
      </div>
    </div>
  );
}

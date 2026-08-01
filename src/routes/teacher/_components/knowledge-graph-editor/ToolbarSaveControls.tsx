import { useTranslation } from "react-i18next";
import { X, Save, Send, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { KnowledgeGraphEditorController } from "./use-knowledge-graph-editor";

/**
 * Right half of the toolbar's action cluster: dirty / published state, Save,
 * Publish and close. Rendered as a fragment so the surrounding flex row is
 * unchanged.
 */
export function ToolbarSaveControls({
  editor,
}: {
  editor: KnowledgeGraphEditorController;
}) {
  const { t } = useTranslation();
  const { draftQuery, saveMutation, publishMutation, persistence, busy } =
    editor;
  const { isDirty, validationError, handleSave, handlePublish, requestClose } =
    persistence;

  return (
    <>
      <div className="mx-1 h-6 w-px bg-m3-outline-variant/30" />
      {isDirty ? (
        <span className="text-[11px] font-semibold text-amber-700">
          {t("teacher_kg_editor.unsaved")}
        </span>
      ) : draftQuery.data?.is_published ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <Check className="h-3.5 w-3.5" />
          {t("teacher_kg_editor.published_state")}
        </span>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleSave}
        disabled={busy || !!validationError || !isDirty}
        className="gap-1.5"
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {t("teacher_kg_editor.save")}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={handlePublish}
        disabled={busy || !!validationError}
        className="gap-1.5 gradient-primary text-white border-0"
      >
        {publishMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {t("teacher_kg_editor.publish")}
      </Button>
      <button
        type="button"
        onClick={requestClose}
        aria-label={t("common.close")}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface"
      >
        <X className="h-5 w-5" />
      </button>
    </>
  );
}

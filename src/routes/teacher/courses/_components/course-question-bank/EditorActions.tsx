import { useTranslation } from "react-i18next";
import { Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EditorState } from "./types";

/**
 * The editor's cancel / save footer, extracted verbatim from the former
 * 843-line course-question-bank.tsx.
 */
export function EditorActions({
  draft,
  saving,
  onCancel,
  onSave,
}: {
  draft: EditorState;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-end gap-2 border-t border-m3-outline-variant/20 pt-2.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={saving}
        onClick={onCancel}
        className="gap-1.5 transition-transform duration-150 active:scale-95"
      >
        <X className="h-4 w-4" />
        {t("common.cancel")}
      </Button>
      <Button
        type="button"
        size="sm"
        className="gap-1.5 transition-transform duration-150 hover:-translate-y-px active:scale-95"
        disabled={saving || !draft.prompt_text.trim()}
        onClick={onSave}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {t("common.save")}
      </Button>
    </div>
  );
}

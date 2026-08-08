import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { KgSource } from "./types";

/**
 * Edit lives HERE (in the detail screen), not on the lesson-settings card, so
 * view and edit are two modes of the same screen. Only the curated graph is
 * editable — the AI graph is regenerated on every ingest, so edits to it would
 * be silently overwritten.
 */
export function KgEditButton({
  source,
  onEdit,
}: {
  source: KgSource;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Button variant="ghost"
      type="button"
      onClick={onEdit}
      disabled={source !== "curated"}
      title={
        source === "curated"
          ? t("teacher_lesson_materials.kg.edit")
          : t("teacher_lesson_materials.kg.edit_ai_disabled")
      }
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
        source === "curated"
          ? "bg-m3-surface-container text-m3-on-surface-variant hover:text-m3-primary"
          : "bg-m3-surface-container/50 text-m3-on-surface-variant/40 cursor-not-allowed",
      )}
    >
      <Pencil className="h-3.5 w-3.5" />
      {t("teacher_lesson_materials.kg.edit")}
    </Button>
  );
}

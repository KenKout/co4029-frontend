import { Sparkles, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { KgSource } from "./types";

/**
 * Graph source: the AI-derived concept graph (read-only, regenerated on every
 * ingest) vs the teacher's curated graph (editable, what students see once
 * published). Only rendered when the parent wires up a curated source.
 */
export function KgSourceToggle({
  source,
  onSourceChange,
}: {
  source: KgSource;
  onSourceChange: (next: KgSource) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("teacher_lesson_materials.kg.source_label")}
      className="flex items-center rounded-lg border border-m3-outline-variant/30 bg-m3-surface-container p-0.5"
    >
      <Button variant="ghost"
        type="button"
        onClick={() => onSourceChange("ai")}
        aria-pressed={source === "ai"}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
          source === "ai"
            ? "bg-m3-primary text-white"
            : "text-m3-on-surface-variant hover:text-m3-primary",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t("teacher_lesson_materials.kg.source_ai")}
      </Button>
      <Button variant="ghost"
        type="button"
        onClick={() => onSourceChange("curated")}
        aria-pressed={source === "curated"}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
          source === "curated"
            ? "bg-m3-primary text-white"
            : "text-m3-on-surface-variant hover:text-m3-primary",
        )}
      >
        <Pencil className="h-3.5 w-3.5" />
        {t("teacher_lesson_materials.kg.source_curated")}
      </Button>
    </div>
  );
}

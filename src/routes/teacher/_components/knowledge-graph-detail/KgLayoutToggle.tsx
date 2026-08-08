import { Circle, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { KgLayoutMode } from "./types";

/** Layout mode toggle: Circular (radial) vs Tree (prereq hierarchy). */
export function KgLayoutToggle({
  layoutMode,
  onLayoutModeChange,
}: {
  layoutMode: KgLayoutMode;
  onLayoutModeChange: (next: KgLayoutMode) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="group"
      aria-label={t("teacher_lesson_materials.kg.layout_label")}
      className="flex items-center rounded-lg border border-m3-outline-variant/30 bg-m3-surface-container p-0.5"
    >
      <Button variant="ghost"
        type="button"
        onClick={() => onLayoutModeChange("circular")}
        aria-pressed={layoutMode === "circular"}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors h-auto whitespace-normal",
          layoutMode === "circular"
            ? "bg-m3-primary text-white"
            : "text-m3-on-surface-variant hover:text-m3-primary",
        )}
      >
        <Circle className="h-3.5 w-3.5" />
        {t("teacher_lesson_materials.kg.layout_circular")}
      </Button>
      <Button variant="ghost"
        type="button"
        onClick={() => onLayoutModeChange("tree")}
        aria-pressed={layoutMode === "tree"}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors h-auto whitespace-normal",
          layoutMode === "tree"
            ? "bg-m3-primary text-white"
            : "text-m3-on-surface-variant hover:text-m3-primary",
        )}
      >
        <Workflow className="h-3.5 w-3.5" />
        {t("teacher_lesson_materials.kg.layout_tree")}
      </Button>
    </div>
  );
}

import { Brain, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { KgEditButton } from "./KgEditButton";
import { KgLayoutToggle } from "./KgLayoutToggle";
import { KgSourceToggle } from "./KgSourceToggle";
import type { KgLayoutMode, KgSource } from "./types";
import { Button } from "@/components/ui/button";

/**
 * Explorer header: concept title + node count on the left, the source / layout
 * toggles, the Edit affordance and the close button on the right. Extracted
 * verbatim from the former 863-line knowledge-graph-detail.tsx.
 */
export function KgHeader({
  title,
  nodeCount,
  source,
  onSourceChange,
  layoutMode,
  onLayoutModeChange,
  onEdit,
  onClose,
}: {
  title: string;
  nodeCount: number;
  source: KgSource;
  /** Omit to hide the AI/Curated toggle entirely (single-source callers). */
  onSourceChange?: (next: KgSource) => void;
  layoutMode: KgLayoutMode;
  onLayoutModeChange: (next: KgLayoutMode) => void;
  /** Omit to hide the Edit button. Only enabled while viewing `curated`. */
  onEdit?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 border-b border-m3-outline-variant/20 bg-m3-surface-container-lowest px-4 py-3">
      <div className="flex items-center gap-2 min-w-0">
        <Brain className="h-5 w-5 shrink-0 text-m3-secondary" />
        <h2 className="truncate font-headline font-bold text-m3-on-surface">
          {title}
        </h2>
        <span className="shrink-0 rounded-full bg-m3-surface-container px-2 py-0.5 text-[11px] font-semibold text-m3-on-surface-variant">
          {t("teacher_lesson_materials.kg.node_count", {
            count: nodeCount,
          })}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onSourceChange && (
          <KgSourceToggle source={source} onSourceChange={onSourceChange} />
        )}
        <KgLayoutToggle
          layoutMode={layoutMode}
          onLayoutModeChange={onLayoutModeChange}
        />
        {onEdit && <KgEditButton source={source} onEdit={onEdit} />}
        <Button variant="ghost"
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-on-surface"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

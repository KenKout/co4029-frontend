import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { KgRelationGroup } from "./KgRelationGroup";
import { Button } from "@/components/ui/button";
import type {
  KgNodeById,
  KgNodeDatum,
  KgPinnedRelations,
  KgPinnedScreen,
} from "./types";

/**
 * Relationship popup — anchored over the selected node (single-click). Because
 * the camera centres the node, this normally floats mid-canvas just above the
 * concept it describes. It's translated -50% on X to centre on the node, and
 * placed either above (default) or below (when the node is high up) so it never
 * clips the top edge. Extracted verbatim from the former 863-line
 * knowledge-graph-detail.tsx.
 */
export function KgRelationPanel({
  node,
  relations,
  screen,
  nodeById,
  onClose,
  onJump,
}: {
  node: KgNodeDatum;
  relations: KgPinnedRelations;
  screen: KgPinnedScreen;
  nodeById: KgNodeById;
  onClose: () => void;
  onJump: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="absolute z-10 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest/98 p-4 shadow-glass backdrop-blur"
      style={{
        left: screen.x,
        top: screen.below ? screen.y + screen.r + 12 : undefined,
        bottom: screen.below
          ? undefined
          : `calc(100% - ${screen.y - screen.r - 12}px)`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-headline font-bold text-m3-on-surface">
            {node.label}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-m3-secondary">
            {node.type}
          </p>
        </div>
        <Button variant="ghost"
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-m3-surface-container-high"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {node.definition && (
        <p className="mt-1.5 text-xs leading-relaxed text-m3-on-surface-variant">
          {node.definition}
        </p>
      )}

      <div className="mt-3 max-h-[40vh] space-y-3 overflow-y-auto">
        <KgRelationGroup
          label={t("teacher_lesson_materials.kg.rel_prerequisites")}
          ids={relations.prerequisites}
          nodeById={nodeById}
          tone="amber"
          onJump={onJump}
          emptyLabel={t("teacher_lesson_materials.kg.rel_none")}
        />
        <KgRelationGroup
          label={t("teacher_lesson_materials.kg.rel_unlocks")}
          ids={relations.unlocks}
          nodeById={nodeById}
          tone="amber"
          onJump={onJump}
          emptyLabel={t("teacher_lesson_materials.kg.rel_none")}
        />
        <KgRelationGroup
          label={t("teacher_lesson_materials.kg.rel_related")}
          ids={relations.related}
          nodeById={nodeById}
          tone="slate"
          onJump={onJump}
          emptyLabel={t("teacher_lesson_materials.kg.rel_none")}
        />
      </div>
    </div>
  );
}

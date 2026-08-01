import { History, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { MaterialStatus } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

/**
 * Hover action rail of a material card: enable-AI, reprocess, version history
 * and delete. Extracted verbatim from the former 1422-line material-hub.tsx.
 */
export function MaterialCardActions({
  materialId,
  status,
  notQueued,
  enablingAI,
  reprocessPending,
  showVersions,
  onEnableAI,
  onReprocess,
  onToggleVersions,
  onDelete,
}: {
  materialId: string;
  status: MaterialStatus | undefined;
  notQueued: boolean;
  enablingAI: boolean;
  reprocessPending: boolean;
  showVersions: boolean;
  onEnableAI: () => void;
  onReprocess: () => void;
  onToggleVersions: () => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      {/* Visibility toggle removed from Material history — student
          visibility is controlled via Downloadable Resources / lesson
          Publish, so it doesn't belong on the AI-material history card. */}
      {notQueued && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-m3-secondary hover:text-m3-secondary hover:bg-m3-secondary-fixed/30"
          title={t("teacher_lesson_materials.actions.enable_ai")}
          disabled={enablingAI}
          onClick={onEnableAI}
        >
          {enablingAI ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
      {!notQueued &&
        (status?.processing_status === "failed" ||
          status?.processing_status === "ready") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={t("teacher_lesson_materials.actions.reprocess")}
            disabled={reprocessPending}
            onClick={onReprocess}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", reprocessPending && "animate-spin")}
            />
          </Button>
        )}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8", showVersions && "bg-m3-surface-container")}
        title={t("teacher_lesson_materials.versions.toggle")}
        onClick={onToggleVersions}
      >
        <History className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-m3-error hover:text-m3-error hover:bg-m3-error-container/30"
        title={t("common.delete")}
        onClick={() => onDelete(materialId)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

import {
  Eye,
  EyeOff,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
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
  visible,
  visibilityPending,
  canShow,
  showVersions,
  onEnableAI,
  onReprocess,
  onToggleVisibility,
  onToggleVersions,
  onDelete,
}: {
  materialId: string;
  status: MaterialStatus | undefined;
  notQueued: boolean;
  enablingAI: boolean;
  reprocessPending: boolean;
  visible: boolean;
  visibilityPending: boolean;
  canShow: boolean;
  showVersions: boolean;
  onEnableAI: () => void;
  onReprocess: () => void;
  onToggleVisibility: () => void;
  onToggleVersions: () => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 items-center gap-1">
      <VisibilityButton
        visible={visible}
        pending={visibilityPending}
        canShow={canShow}
        onToggle={onToggleVisibility}
      />
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

function VisibilityButton({
  visible,
  pending,
  canShow,
  onToggle,
}: {
  visible: boolean;
  pending: boolean;
  canShow: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const label = t(
    visible
      ? "teacher_lesson_materials.actions.toggle_visibility_hide"
      : "teacher_lesson_materials.actions.toggle_visibility_show",
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8",
        visible
          ? "text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
          : "text-m3-on-surface-variant",
      )}
      title={label}
      aria-label={label}
      disabled={pending || (!visible && !canShow)}
      onClick={onToggle}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : visible ? (
        <Eye className="h-3.5 w-3.5" />
      ) : (
        <EyeOff className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

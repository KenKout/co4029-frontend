import { Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  useMaterialVersions,
  useRollbackMaterialVersion,
} from "@/lib/api/hooks/materials";
import { cn } from "@/lib/utils";

/**
 * Version history for one material, with per-version rollback. Extracted
 * verbatim from the former 1422-line material-hub.tsx.
 */
export function MaterialVersionsPanel({ materialId }: { materialId: string }) {
  const { t } = useTranslation();
  const { data: versions, isLoading } = useMaterialVersions(materialId);
  const rollback = useRollbackMaterialVersion(materialId);

  function handleRollback(versionId: string) {
    rollback.mutate(versionId, {
      onSuccess: () =>
        toast.success(t("teacher_lesson_materials.versions.rollback_success")),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.error(t("teacher_lesson_materials.versions.rollback_rejected"));
          return;
        }
        toast.error((err as Error).message);
      },
    });
  }

  return (
    <div className="border-t border-m3-outline-variant/20 px-4 py-3 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
        {t("teacher_lesson_materials.versions.title")}
      </p>
      {isLoading ? (
        <div className="h-8 bg-m3-surface-container animate-pulse rounded-lg" />
      ) : !versions?.length ? (
        <p className="text-xs text-m3-on-surface-variant">
          {t("teacher_lesson_materials.versions.empty")}
        </p>
      ) : (
        versions.map((v) => (
          <div key={v.id} className="flex items-center gap-3 text-xs py-1">
            <span className="font-mono font-medium text-m3-on-surface w-8">
              v{v.version_no}
            </span>
            <Badge
              className={cn(
                "text-[10px] border-0",
                v.processing_status === "ready"
                  ? "bg-emerald-100 text-emerald-700"
                  : v.processing_status === "failed"
                    ? "bg-m3-error-container text-m3-on-error-container"
                    : "bg-m3-surface-container text-m3-on-surface-variant",
              )}
            >
              {v.processing_status}
            </Badge>
            <span className="text-m3-on-surface-variant flex-1 truncate">
              {new Date(v.uploaded_at).toLocaleString()}
            </span>
            {v.is_current ? (
              <Badge className="text-[10px] border-0 bg-m3-primary/10 text-m3-primary">
                {t("teacher_lesson_materials.versions.current")}
              </Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                disabled={v.processing_status !== "ready" || rollback.isPending}
                title={
                  v.processing_status !== "ready"
                    ? t("teacher_lesson_materials.versions.not_ready")
                    : undefined
                }
                onClick={() => handleRollback(v.id)}
              >
                <Undo2 className="h-3 w-3" />
                {t("teacher_lesson_materials.versions.rollback")}
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

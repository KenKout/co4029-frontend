import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useReprocessMaterial,
  useTeacherMaterialStatus,
  useUpdateMaterial,
} from "@/lib/api/hooks/materials";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/client";
import type { LearningMaterial } from "@/lib/api/types/teacher";

import { PROC_STATUS } from "./constants";
import { materialIcon } from "./helpers";
import { MaterialCardActions } from "./MaterialCardActions";
import { MaterialCardBadges } from "./MaterialCardBadges";
import { MaterialVersionsPanel } from "./MaterialVersionsPanel";

/**
 * One processed material in the history list. This is the orchestrator: the
 * status poll, the reprocess / enable-AI mutations and composition. The badge
 * row and the hover action rail are their own components.
 */
export function MaterialCard({
  material,
  onDelete,
}: {
  material: LearningMaterial;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { data: status } = useTeacherMaterialStatus(material.id);
  const reprocess = useReprocessMaterial(material.id);
  const updateMaterial = useUpdateMaterial(material.id);
  const [showVersions, setShowVersions] = useState(false);

  const notQueued = !material.ai_processing_enabled && !status?.active_job_id;
  const procKey = notQueued
    ? "not_queued"
    : (status?.processing_status ?? "pending");
  const proc = PROC_STATUS[procKey] ?? PROC_STATUS.pending;
  const Icon = materialIcon(material.material_type);

  function handleReprocess() {
    reprocess.mutate(undefined, {
      onSuccess: () =>
        toast.success(t("teacher_lesson_materials.toasts.reprocess_started")),
      onError: (err) => {
        if (
          err instanceof ApiError &&
          err.status === 409 &&
          err.code === "concurrent_reprocess"
        ) {
          toast.error(t("teacher_lesson_materials.toasts.reprocess_busy"));
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          toast.error(t("teacher_lesson_materials.toasts.reprocess_forbidden"));
          return;
        }
        toast.error(
          (err as Error).message ||
            t("teacher_lesson_materials.toasts.reprocess_failed"),
        );
      },
    });
  }

  function handleEnableAI() {
    updateMaterial.mutate(
      { ai_processing_enabled: true },
      {
        onSuccess: () =>
          reprocess.mutate(undefined, {
            onSuccess: () =>
              toast.success(t("teacher_lesson_materials.toasts.ai_enabled")),
            onError: (err) => {
              if (
                err instanceof ApiError &&
                err.status === 409 &&
                err.code === "concurrent_reprocess"
              ) {
                toast.error(
                  t("teacher_lesson_materials.toasts.reprocess_busy"),
                );
                return;
              }
              toast.error((err as Error).message);
            },
          }),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 403) {
            toast.error(t("teacher_lesson_materials.toasts.edit_forbidden"));
            return;
          }
          toast.error((err as Error).message);
        },
      },
    );
  }

  const enablingAI = updateMaterial.isPending || reprocess.isPending;

  return (
    <div className="bg-card rounded-xl border border-m3-outline-variant/20 hover:border-m3-outline-variant/40 transition-colors">
      <div className="flex items-center gap-4 p-4 group">
        <div className="h-10 w-10 rounded-xl bg-m3-surface-container flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-m3-on-surface-variant" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-m3-on-surface truncate">
            {material.title}
          </p>
          <MaterialCardBadges
            material={material}
            proc={proc}
            procKey={procKey}
          />
          {status?.processing_error && (
            <p className="text-[11px] text-red-600 mt-1 truncate">
              {status.processing_error}
            </p>
          )}
        </div>

        <MaterialCardActions
          materialId={material.id}
          status={status}
          notQueued={notQueued}
          enablingAI={enablingAI}
          reprocessPending={reprocess.isPending}
          showVersions={showVersions}
          onEnableAI={handleEnableAI}
          onReprocess={handleReprocess}
          onToggleVersions={() => setShowVersions((v) => !v)}
          onDelete={onDelete}
        />
      </div>
      {showVersions && <MaterialVersionsPanel materialId={material.id} />}
    </div>
  );
}

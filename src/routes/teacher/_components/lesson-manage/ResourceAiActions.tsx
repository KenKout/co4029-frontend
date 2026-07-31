import { useTranslation } from "react-i18next";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  useReprocessMaterial,
  useUpdateMaterial,
} from "@/lib/api/hooks/materials";
import type { LearningMaterial } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";

/**
 * AI-twin actions on a resource card. A downloadable resource uploaded with
 * "Use for AI" on has a correlated AI Hub material (its "twin", same
 * storage_object_id). These are the twin's controls surfaced right on the
 * resource so the teacher doesn't have to dig into the AI Hub:
 *   - Hide/Show: flips `visible_to_students` — THIS is what makes the student-
 *     side live preview appear. Twins default to hidden on upload, which is
 *     why freshly-uploaded docs show nothing on the student page.
 *   - Retry: reprocess a failed/cancelled ingestion so the preview can build.
 * Only rendered when a twin exists, so the hooks (which need the twin id) are
 * always called unconditionally.
 */
export function ResourceAiActions({
  twin,
  onShown,
}: {
  twin: LearningMaterial;
  /** Called after a material is made visible, so the caller can claim the
      lesson's primary-material slot (required for the student preview). */
  onShown: (materialId: string) => void;
}) {
  const { t } = useTranslation();
  const status = twin.latest_version?.processing_status;
  const reprocess = useReprocessMaterial(twin.id);
  const updateMaterial = useUpdateMaterial(twin.id);
  const visible = twin.visible_to_students;
  const failed = status === "failed" || status === "cancelled";
  const ready = status === "ready";

  function toggleVisible() {
    const showing = !visible;
    updateMaterial.mutate(
      { visible_to_students: showing },
      {
        onSuccess: () => {
          // Showing a doc is only half the job — the student pane renders the
          // lesson's primary_material_id, so claim that slot too when showing.
          if (showing) onShown(twin.id);
          toast.success(
            showing
              ? t("teacher_lesson_manage.resource_ai.now_visible")
              : t("teacher_lesson_manage.resource_ai.now_hidden"),
          );
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  }

  function handleRetry() {
    reprocess.mutate(undefined, {
      onSuccess: () =>
        toast.success(t("teacher_lesson_manage.resource_ai.retry_started")),
      onError: (err) => toast.error((err as Error).message),
    });
  }

  return (
    <>
      {failed && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={reprocess.isPending}
          title={t("teacher_lesson_manage.resource_ai.retry")}
          className="p-2 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-40"
        >
          <RefreshCw
            className={cn("h-4 w-4", reprocess.isPending && "animate-spin")}
          />
        </button>
      )}
      <button
        type="button"
        onClick={toggleVisible}
        // Only a ready doc can actually preview for students; guard the toggle
        // so hiding/showing a still-processing doc can't mislead.
        disabled={updateMaterial.isPending || (!ready && !visible)}
        title={
          !ready && !visible
            ? t("teacher_lesson_manage.resource_ai.not_ready")
            : visible
              ? t("teacher_lesson_manage.resource_ai.hide")
              : t("teacher_lesson_manage.resource_ai.show")
        }
        className={cn(
          "p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40",
          visible
            ? "text-emerald-600 hover:bg-emerald-100"
            : "text-m3-on-surface-variant hover:bg-m3-surface-container-highest",
        )}
      >
        {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </>
  );
}

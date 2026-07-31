import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  useTeacherLessonMaterials,
  useTeacherProcessingSummary,
} from "@/lib/api/hooks/materials";
import {
  ProcessingStatusCard,
  MaterialCard,
  MaterialDeleteButton,
  RecentlyDeletedSection,
} from "../material-hub";

/**
 * Material history — folded in from the former AI Material Hub page. Live
 * processing status → processed-material list (with the two-click delete-
 * confirm pattern) → recently-deleted restore. Shared by reading and video
 * lessons. Upload happens once via "Downloadable Resources" on the page; this
 * section is history/management only.
 */
export function MaterialHistorySection({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const { data: materials = [], isLoading: materialsLoading } =
    useTeacherLessonMaterials(lessonId);
  const { data: summary } = useTeacherProcessingSummary(lessonId);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const readyCount = summary?.completed_versions ?? 0;
  const processingCount = summary?.processing_versions ?? 0;
  const processingMaterial =
    processingCount > 0
      ? materials.find((m) => m.current_version_id !== null)
      : undefined;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-headline font-bold text-2xl text-m3-primary">
          {t("teacher_lesson_manage.sections.material_history")}
        </h2>
        <div className="flex gap-2 flex-wrap shrink-0">
          {processingCount > 0 && (
            <Badge className="bg-blue-100 text-blue-700 border-0 gap-1.5 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("teacher_lesson_materials.header.processing_count", {
                count: processingCount,
              })}
            </Badge>
          )}
          {readyCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1.5 text-xs">
              <CheckCircle className="h-3 w-3" />
              {t("teacher_lesson_materials.header.ready_count", {
                count: readyCount,
              })}
            </Badge>
          )}
        </div>
      </div>

      {/* Upload removed here — files are attached once via "Downloadable
          Resources" below (its "Use for AI" toggle routes a file into AI
          processing, after which it appears in this history with the live
          progress card). This section is now history/management only, so the
          teacher never sees two competing upload fields. */}

      {/* Live processing status (the "AI progress" pattern the user liked). */}
      {processingCount > 0 && processingMaterial && (
        <ProcessingStatusCard material={processingMaterial} />
      )}

      {/* Processed-material list with the two-click delete confirm. */}
      {materialsLoading ? (
        <PageSkeleton rows={2} />
      ) : materials.length === 0 ? (
        <div className="text-center py-10 text-m3-on-surface-variant bg-m3-surface-container-low/50 rounded-xl">
          <FileText className="h-9 w-9 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {t("teacher_lesson_materials.history.empty_title")}
          </p>
          <p className="text-xs mt-1 text-m3-on-surface-variant/70">
            {t("teacher_lesson_materials.history.empty_body")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => (
            <div key={material.id}>
              <MaterialCard
                material={material}
                onDelete={(id) => setPendingDeleteId(id)}
              />
              {pendingDeleteId === material.id && (
                <div className="mt-2 flex items-center justify-end gap-2 px-4 py-3 rounded-xl bg-m3-error-container/20 border border-m3-error/20 text-xs text-m3-on-surface">
                  <span className="text-m3-error font-medium">
                    {t("teacher_lesson_materials.confirm_delete.inline")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDeleteId(null)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <MaterialDeleteButton
                    id={material.id}
                    onDeleted={() => setPendingDeleteId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <RecentlyDeletedSection lessonId={lessonId} />
    </section>
  );
}

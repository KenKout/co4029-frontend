import { FileText, History, Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  useRestoreMaterial,
  useTeacherDeletedMaterials,
} from "@/lib/api/hooks/materials";

/**
 * Tombstoned materials with one-click restore. Extracted verbatim from the
 * former 1422-line material-hub.tsx.
 */
export function RecentlyDeletedSection({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const { data: deleted = [] } = useTeacherDeletedMaterials(lessonId);
  const restore = useRestoreMaterial(lessonId);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Nothing tombstoned → don't render the section at all (no empty clutter).
  if (deleted.length === 0) return null;

  function handleRestore(id: string) {
    setRestoringId(id);
    restore.mutate(id, {
      onSuccess: () =>
        toast.success(t("teacher_lesson_materials.recently_deleted.restored")),
      onError: (err) =>
        toast.error(
          (err as Error).message ||
            t("teacher_lesson_materials.recently_deleted.restore_failed"),
        ),
      onSettled: () => setRestoringId(null),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-m3-on-surface-variant" />
        <h2 className="font-headline font-bold text-m3-on-surface text-lg">
          {t("teacher_lesson_materials.recently_deleted.title")}
        </h2>
      </div>
      <p className="text-xs text-m3-on-surface-variant">
        {t("teacher_lesson_materials.recently_deleted.hint")}
      </p>
      <div className="space-y-2">
        {deleted.map((material) => (
          <div
            key={material.id}
            className="flex items-center justify-between gap-3 p-4 rounded-xl bg-m3-surface-container-low/60 border border-m3-outline-variant/20"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-m3-surface-container flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-m3-on-surface-variant" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-m3-on-surface truncate">
                  {material.title}
                </p>
                <p className="text-xs text-m3-on-surface-variant capitalize">
                  {material.material_type}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              disabled={restoringId === material.id}
              onClick={() => handleRestore(material.id)}
            >
              {restoringId === material.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
              {t("teacher_lesson_materials.recently_deleted.restore")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchTeacherResourceDownloadUrl } from "@/lib/api/hooks/teacher-courses";
import type { LessonResource } from "@/lib/api/types/common";
import type { LearningMaterial } from "@/lib/api/types/teacher";
import { cn } from "@/lib/utils";
import { resourceStyle } from "./constants";
import { AiStatusBadge } from "./AiStatusBadge";
import { ResourceAiActions } from "./ResourceAiActions";

/**
 * A single downloadable-resource row: file-type icon, title, AI-sync status
 * badge, and (on hover) the AI-twin hide/show/retry actions, download, and
 * delete. The download resolves a signed URL on demand and opens it.
 */
export function ResourceCard({
  resource,
  onDelete,
  twin,
  onShown,
}: {
  resource: LessonResource;
  onDelete: (id: string) => void;
  /** Correlated AI Hub material (same storage_object_id), or undefined. */
  twin: LearningMaterial | undefined;
  /** Claim the lesson's primary-material slot after a doc is made visible. */
  onShown: (materialId: string) => void;
}) {
  const { t } = useTranslation();
  const style = resourceStyle(resource.title);
  const [downloading, setDownloading] = useState(false);
  const aiStatus = twin?.latest_version?.processing_status;

  async function handleDownload() {
    if (!resource.storage_object_id || downloading) return;
    setDownloading(true);
    try {
      const url = await fetchTeacherResourceDownloadUrl(resource.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("teacher_lesson_manage.toasts.download_failed"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-m3-surface-container-low rounded-xl group hover:bg-m3-surface-container-high transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            style.bg,
            style.text,
          )}
        >
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-m3-on-surface text-sm truncate">
            {resource.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-m3-on-surface-variant capitalize">
              {resource.resource_type}
            </p>
            <AiStatusBadge status={aiStatus} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
        {twin && <ResourceAiActions twin={twin} onShown={onShown} />}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || !resource.storage_object_id}
          title={resource.storage_object_id ? "Download" : "No file attached"}
          className="p-2 rounded-lg text-m3-on-surface-variant hover:bg-m3-surface-container-highest transition-colors cursor-pointer disabled:opacity-40"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onDelete(resource.id)}
          className="p-2 rounded-lg text-m3-error hover:bg-m3-error-container/30 transition-colors cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

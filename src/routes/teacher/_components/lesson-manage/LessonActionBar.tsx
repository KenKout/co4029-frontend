import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sticky top action bar for the lesson editor: Back · Archive · Delete ·
 * Publish/Unpublish · Save. Archive and Delete use a two-click confirm (first
 * click arms the button, second executes). The Back link is intercepted while
 * the lesson is dirty so the caller's unsaved-changes guard can prompt.
 */
export function LessonActionBar({
  courseId,
  moduleId,
  isDirty,
  onBackWhileDirty,
  archiveConfirm,
  onArchive,
  onArchiveBlur,
  deleteConfirm,
  onDelete,
  onDeleteBlur,
  status,
  onToggleStatus,
  saving,
  saved,
  onSave,
}: {
  courseId: string;
  moduleId: string;
  isDirty: boolean;
  /** Invoked (instead of navigating) when Back is clicked while dirty. */
  onBackWhileDirty: () => void;
  archiveConfirm: boolean;
  onArchive: () => void;
  onArchiveBlur: () => void;
  deleteConfirm: boolean;
  onDelete: () => void;
  onDeleteBlur: () => void;
  status: "draft" | "published";
  onToggleStatus: () => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="sticky top-16 z-10 -mx-1 mb-8 flex items-center justify-between gap-3 border-b border-m3-outline-variant/15 bg-m3-surface/85 px-1 py-3 backdrop-blur-md">
      {/* Back to the parent module/course. Intercepted so unsaved lesson
          edits prompt first — a plain <Link> would navigate straight away and
          silently drop the draft. */}
      <Link
        to={
          moduleId
            ? "/teacher/courses/$courseId/modules/$moduleId"
            : "/teacher/courses/$courseId"
        }
        params={moduleId ? { courseId, moduleId } : { courseId }}
        onClick={(e) => {
          if (!isDirty) return; // let the Link do its normal thing
          e.preventDefault();
          onBackWhileDirty();
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2.5 gap-2 text-m3-on-surface-variant"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">
            {t("teacher_common.back_to_course")}
          </span>
        </Button>
      </Link>
      <div className="flex items-center gap-2">
        {/* Archive (two-click confirm) */}
        <Button
          variant={archiveConfirm ? "default" : "ghost"}
          size="sm"
          onClick={onArchive}
          onBlur={onArchiveBlur}
          className={cn(
            "gap-2 cursor-pointer",
            archiveConfirm
              ? "bg-amber-500 hover:bg-amber-600 text-white border-0"
              : "text-m3-on-surface-variant hover:text-amber-600",
          )}
          title={t("teacher_lesson_manage.actions.archive_title")}
        >
          <Archive className="h-4 w-4" />
          <span className="hidden sm:inline">
            {archiveConfirm
              ? t("teacher_lesson_manage.actions.archive_confirm")
              : t("teacher_lesson_manage.actions.archive")}
          </span>
        </Button>

        {/* Delete (two-click confirm) */}
        <Button
          variant={deleteConfirm ? "default" : "ghost"}
          size="sm"
          onClick={onDelete}
          onBlur={onDeleteBlur}
          className={cn(
            "gap-2 cursor-pointer",
            deleteConfirm
              ? "bg-m3-error hover:opacity-90 text-white border-0"
              : "text-m3-on-surface-variant hover:text-m3-error",
          )}
          title={t("teacher_lesson_manage.actions.delete_title")}
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">
            {deleteConfirm
              ? t("teacher_lesson_manage.actions.delete_confirm")
              : t("teacher_lesson_manage.actions.delete")}
          </span>
        </Button>

        <span className="mx-0.5 h-5 w-px bg-m3-outline-variant/30" />

        {/* Publish / Unpublish — flips local `status`; persisted on Save. */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleStatus}
          className={cn(
            "gap-2 cursor-pointer border-m3-outline-variant/30",
            status === "published"
              ? "text-emerald-600 hover:text-emerald-700"
              : "text-m3-on-surface-variant",
          )}
          title={
            status === "published"
              ? t("teacher_lesson_manage.actions.unpublish_title")
              : t("teacher_lesson_manage.actions.publish_title")
          }
        >
          {status === "published" ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {status === "published"
              ? t("teacher_lesson_manage.actions.published")
              : t("teacher_lesson_manage.actions.draft")}
          </span>
        </Button>

        {/* Save */}
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className={cn(
            "gap-2 transition-all cursor-pointer",
            saved
              ? "bg-green-500 hover:bg-green-600 text-white border-0"
              : "gradient-primary text-white border-0 shadow-ai-glow hover:opacity-90 active:scale-95",
          )}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {saved
              ? t("teacher_common.saved_check")
              : t("teacher_common.save_changes")}
          </span>
        </Button>
      </div>
    </div>
  );
}

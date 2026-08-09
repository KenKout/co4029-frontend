import { toast } from "sonner";
import type { TFunction } from "i18next";
import type { LessonEditorState, LessonManageData } from "./types";

/**
 * Lesson-editor commands that write to the server or navigate: save, archive,
 * delete, the transient feedback bar, and the prerequisite toggle. Plain
 * closures — no hooks of its own, so it does not shift the page's hook order.
 */
export function useLessonManageActions({
  t,
  data,
  editor,
}: {
  t: TFunction;
  data: LessonManageData;
  editor: LessonEditorState;
}) {
  const { courseId, lessonId, moduleId, moduleItem, navigate } = data;
  const { updateLesson, updateModuleItem, deleteLesson } = data;

  function showFeedback(msg: string) {
    editor.setFeedback(msg);
    setTimeout(() => editor.setFeedback(null), 2000);
  }

  function goBack() {
    void navigate(
      moduleId
        ? {
            to: "/teacher/courses/$courseId/modules/$moduleId",
            params: { courseId, moduleId },
          }
        : {
            to: "/teacher/courses/$courseId",
            params: { courseId },
          },
    );
  }

  async function handleSave() {
    editor.setSaving(true);
    try {
      const saves: Promise<unknown>[] = [
        updateLesson.mutateAsync({
          title: editor.title.trim() || undefined,
          summary: editor.summary.trim() || undefined,
          lesson_type: editor.lessonType as "video" | "reading",
          status: editor.status,
          difficulty: editor.difficulty || undefined,
          estimated_minutes: editor.estimatedMinutes
            ? Number(editor.estimatedMinutes)
            : undefined,
          notes_markdown: editor.notes || undefined,
        }),
      ];
      if (moduleItem) {
        saves.push(
          updateModuleItem.mutateAsync({
            itemId: moduleItem.id,
            payload: {
              unlock_rule_json: { prerequisites: editor.prerequisites },
            },
          }),
        );
      }
      await Promise.all(saves);
      editor.setSaved(true);
      setTimeout(() => editor.setSaved(false), 2000);
      toast.success(t("teacher_common.lesson_saved"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || t("teacher_lesson_manage.toasts.save_failed"),
      );
    } finally {
      editor.setSaving(false);
    }
  }

  async function handleArchive() {
    if (!editor.archiveConfirm) {
      editor.setArchiveConfirm(true);
      return;
    }
    try {
      await updateLesson.mutateAsync({ status: "archived" });
      toast.success(t("teacher_lesson_manage.toasts.lesson_archived"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_lesson_manage.toasts.archive_failed"),
      );
    }
  }

  /**
   * Publish / unpublish the lesson immediately — a single direct API call
   * that does NOT wait for the Save bar. The editor's local status is synced
   * to the server's answer so a later Save can never silently flip it back.
   */
  async function handlePublish(next: "draft" | "published") {
    try {
      const updated = await updateLesson.mutateAsync({ status: next });
      editor.setStatus(updated.status === "published" ? "published" : "draft");
      toast.success(
        next === "published"
          ? t("teacher_lesson_manage.toasts.lesson_published")
          : t("teacher_lesson_manage.toasts.lesson_unpublished"),
      );
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_lesson_manage.toasts.publish_failed"),
      );
      throw err;
    }
  }

  async function handleDelete() {
    if (!editor.deleteConfirm) {
      editor.setDeleteConfirm(true);
      return;
    }
    try {
      await deleteLesson.mutateAsync(lessonId);
      toast.success(t("teacher_lesson_manage.toasts.lesson_deleted"));
      // Redirect back to the parent module (or course) — the lesson page no
      // longer exists, so staying here would show a broken/empty view.
      goBack();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_lesson_manage.toasts.delete_failed"),
      );
    }
  }

  function togglePrerequisite(id: string) {
    editor.setPrerequisites((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  return {
    showFeedback,
    goBack,
    handleSave,
    handleArchive,
    handlePublish,
    handleDelete,
    togglePrerequisite,
  };
}

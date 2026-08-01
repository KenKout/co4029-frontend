import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Delete action with a two-click confirm: the first click arms the button
 * (error red), the second executes. Blur disarms it.
 */
export function LessonDeleteButton({
  deleteConfirm,
  onDelete,
  onDeleteBlur,
}: {
  deleteConfirm: boolean;
  onDelete: () => void;
  onDeleteBlur: () => void;
}) {
  const { t } = useTranslation();
  return (
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
  );
}

import { useTranslation } from "react-i18next";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Archive action with a two-click confirm: the first click arms the button
 * (amber), the second executes. Blur disarms it.
 */
export function LessonArchiveButton({
  archiveConfirm,
  onArchive,
  onArchiveBlur,
}: {
  archiveConfirm: boolean;
  onArchive: () => void;
  onArchiveBlur: () => void;
}) {
  const { t } = useTranslation();
  return (
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
  );
}

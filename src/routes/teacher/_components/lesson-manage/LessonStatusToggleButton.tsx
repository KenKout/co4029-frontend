import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Publish / Unpublish — flips local `status`; persisted on Save. */
export function LessonStatusToggleButton({
  status,
  onToggleStatus,
}: {
  status: "draft" | "published";
  onToggleStatus: () => void;
}) {
  const { t } = useTranslation();
  return (
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
  );
}

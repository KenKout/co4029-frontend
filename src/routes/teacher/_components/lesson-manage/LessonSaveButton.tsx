import { useTranslation } from "react-i18next";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Save button; flashes green for a beat after a successful save. */
export function LessonSaveButton({
  saving,
  saved,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  return (
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
  );
}

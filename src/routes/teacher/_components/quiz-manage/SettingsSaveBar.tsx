import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sticky action bar: pins to the bottom of the viewport so the teacher can save
 * from anywhere in a long form without scrolling back down. It only becomes an
 * active "unsaved changes" bar when the draft differs from what's saved;
 * otherwise Save is disabled and it stays quiet. Negative margins cancel the
 * form's padding so the bar spans the full card width and reads as a footer.
 * z-10 keeps it under the global ContentTopBar (frontend/AGENTS.md).
 *
 * Extracted from SettingsTab verbatim.
 */
export function SettingsSaveBar({
  saving,
  dirty,
  onReset,
}: {
  saving: boolean;
  dirty: boolean;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="sticky bottom-0 z-10 -mx-6 lg:-mx-8 -mb-6 lg:-mb-8 mt-8">
      <div
        className={cn(
          "flex items-center justify-end gap-3 px-6 lg:px-8 py-4 border-t backdrop-blur-md transition-colors rounded-b-xl",
          dirty
            ? "border-m3-primary/30 bg-m3-primary-fixed/20"
            : "border-m3-outline-variant/20 bg-m3-surface-container-lowest/80",
        )}
      >
        {dirty && (
          <span className="mr-auto text-xs font-semibold text-m3-primary">
            {t("teacher_quiz_manage.settings.unsaved_changes")}
          </span>
        )}
        {dirty && (
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            disabled={saving}
            className="gap-2"
          >
            {t("teacher_quiz_manage.settings.reset_button")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={saving || !dirty}
          className="gap-2 gradient-primary text-white border-0 hover:shadow-ai-glow disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("teacher_quiz_manage.settings.save_button")}
        </Button>
      </div>
    </div>
  );
}

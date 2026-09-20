import { Loader2, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DurationField } from "@/components/ui/duration-field";
import { Textarea } from "@/components/ui/textarea";
import type { ModuleSettingsController } from "./use-module-settings";

/**
 * Description + estimated-duration form in the settings sidebar. Moved verbatim
 * out of `ModuleSettings` in the former 887-line `module-manage.tsx`.
 */
export function ModuleSettingsForm({ ctl }: { ctl: ModuleSettingsController }) {
  const { t } = useTranslation();
  const {
    description,
    setDescription,
    estimatedMinutes,
    setEstimatedMinutes,
    saving,
    handleSave,
  } = ctl;

  return (
    <form
      onSubmit={(event) => void handleSave(event)}
      className="bg-m3-surface-container-low rounded-xl p-5 space-y-4"
    >
      <h3 className="font-headline font-bold text-base text-m3-primary">
        {t("teacher_common.module_settings_title")}
      </h3>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_common.module_description_label")}
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder={t("teacher_common.module_description_placeholder")}
          className="px-4 py-3"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_common.module_duration_label")}
        </label>
        <DurationField
          value={estimatedMinutes}
          onChange={setEstimatedMinutes}
          initialUnit="minutes"
          placeholder={t("teacher_common.module_duration_placeholder")}
        />
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={saving}
        className="w-full gap-2 gradient-primary text-white border-0"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {t("teacher_common.save_module_settings")}
      </Button>
    </form>
  );
}

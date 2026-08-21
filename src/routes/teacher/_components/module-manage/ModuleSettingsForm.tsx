import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ModuleSettingsController } from "./use-module-settings";

/**
 * Description + estimated-duration form in the settings sidebar. Moved verbatim
 * out of `ModuleSettings` in the former 887-line `module-manage.tsx`.
 */
export function ModuleSettingsForm({ ctl }: { ctl: ModuleSettingsController }) {
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
      onSubmit={handleSave}
      className="bg-m3-surface-container-low rounded-xl p-5 space-y-4"
    >
      <h3 className="font-headline font-bold text-base text-m3-primary">
        Settings
      </h3>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Brief description of this module…"
          className="px-4 py-3"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
          Required Duration (min)
        </label>
        <Input
          type="number"
          min={0}
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
          placeholder="e.g. 60"
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
        Save Settings
      </Button>
    </form>
  );
}

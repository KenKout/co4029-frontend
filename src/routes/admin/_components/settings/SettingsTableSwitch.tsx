import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { Switch } from "@/components/ui/switch";
import { settingLabel } from "./helpers";
import type { SettingsTableController } from "./use-settings-table";

/**
 * Toggling stages a pending change; it does not write. The switch reflects the
 * draft so the operator sees what they are about to apply, and the pending
 * badge beside it says the deployment has not moved yet.
 */
export function SettingsTableSwitch({
  controller,
  setting: s,
}: {
  controller: SettingsTableController;
  setting: RuntimeSetting;
}) {
  const { t, draft } = controller;
  return (
    <Switch
      checked={Boolean(draft.displayValue(s))}
      onCheckedChange={(c) => draft.stage(s, c)}
      aria-label={settingLabel(t, s)}
    />
  );
}

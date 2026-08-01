import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { Switch } from "@/components/ui/switch";
import { settingLabel } from "./helpers";
import type { SettingsTableController } from "./use-settings-table";

export function SettingsTableSwitch({
  controller,
  setting: s,
}: {
  controller: SettingsTableController;
  setting: RuntimeSetting;
}) {
  const { t, setMutation } = controller;
  return (
    <Switch
      checked={Boolean(s.effective_value)}
      disabled={setMutation.isPending}
      onCheckedChange={(c) => setMutation.mutate({ key: s.key, value: c })}
      aria-label={settingLabel(t, s)}
    />
  );
}

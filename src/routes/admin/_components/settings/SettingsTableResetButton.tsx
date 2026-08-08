import { RotateCcw } from "lucide-react";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { Button } from "@/components/ui/button";
import type { SettingsTableController } from "./use-settings-table";

export function SettingsTableResetButton({
  controller,
  setting: s,
}: {
  controller: SettingsTableController;
  setting: RuntimeSetting;
}) {
  const { clearMutation, overrideAtScope } = controller;
  const canReset = overrideAtScope(s);
  return (
    <Button variant="ghost"
      type="button"
      title={
        canReset ? "Remove this override" : "Nothing overridden at this scope"
      }
      className="rounded-md p-1 text-slate-400 enabled:hover:bg-slate-100 enabled:hover:text-slate-700 disabled:opacity-30"
      disabled={!canReset || clearMutation.isPending}
      onClick={() => clearMutation.mutate(s.key)}
    >
      <RotateCcw className="h-3.5 w-3.5" />
    </Button>
  );
}

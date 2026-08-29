import { RotateCcw } from "lucide-react";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { Button } from "@/components/ui/button";
import { CLEAR } from "./use-settings-draft";
import type { SettingsTableController } from "./use-settings-table";

/**
 * Stages removal of the override at this scope. Like every other control here
 * it writes nothing — the clear is applied, with a reason, from the apply
 * dialog alongside any other pending edits.
 */
export function SettingsTableResetButton({
  controller,
  setting: s,
}: {
  controller: SettingsTableController;
  setting: RuntimeSetting;
}) {
  const { draft, overrideAtScope } = controller;
  // Nothing to remove if the value is inherited and no clear is already staged.
  const canReset = overrideAtScope(s) && draft.pending.get(s.key) !== CLEAR;
  return (
    <Button
      variant="ghost"
      type="button"
      title={
        canReset ? "Remove this override" : "Nothing overridden at this scope"
      }
      className="rounded-md p-1 text-slate-400 enabled:hover:bg-slate-100 enabled:hover:text-slate-700 disabled:opacity-30 h-auto whitespace-normal"
      disabled={!canReset}
      onClick={() => draft.stage(s, CLEAR)}
    >
      <RotateCcw className="h-3.5 w-3.5" />
    </Button>
  );
}

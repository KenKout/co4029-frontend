import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import type { SettingsTableController } from "./use-settings-table";

/**
 * Numeric editor. Commits into the draft on blur or Enter — the same gestures
 * as before, but they now stage a pending change rather than writing to the
 * deployment.
 *
 * Controlled off `draft.displayValue` rather than `defaultValue`: an
 * uncontrolled input would keep showing a typed number after Discard threw the
 * change away, leaving the field disagreeing with what is actually pending.
 */
export function SettingsTableNumberInput({
  controller,
  setting: s,
}: {
  controller: SettingsTableController;
  setting: RuntimeSetting;
}) {
  const { draft } = controller;

  const commit = (raw: string) => {
    const v = Number(raw);
    // A non-numeric or empty field stages nothing. Silently coercing it to 0
    // would let an empty box become a real change nobody chose.
    if (raw.trim() === "" || Number.isNaN(v)) return;
    draft.stage(s, v);
  };

  return (
    <input
      type="number"
      value={String(draft.displayValue(s))}
      step={s.type === "float" ? "0.01" : "1"}
      min={s.minimum ?? undefined}
      max={s.maximum ?? undefined}
      className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm tabular-nums focus:border-m3-primary focus:outline-none focus:ring-1 focus:ring-m3-primary/40"
      onChange={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
      }}
    />
  );
}

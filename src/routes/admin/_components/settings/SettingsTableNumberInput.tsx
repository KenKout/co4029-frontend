import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import type { SettingsTableController } from "./use-settings-table";

export function SettingsTableNumberInput({
  controller,
  setting: s,
}: {
  controller: SettingsTableController;
  setting: RuntimeSetting;
}) {
  const { setMutation } = controller;
  return (
    <input
      type="number"
      defaultValue={String(s.effective_value)}
      step={s.type === "float" ? "0.01" : "1"}
      min={s.minimum ?? undefined}
      max={s.maximum ?? undefined}
      className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm tabular-nums focus:border-m3-primary focus:outline-none focus:ring-1 focus:ring-m3-primary/40"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const v = Number((e.target as HTMLInputElement).value);
          if (!Number.isNaN(v)) setMutation.mutate({ key: s.key, value: v });
        }
      }}
      onBlur={(e) => {
        const v = Number(e.target.value);
        if (!Number.isNaN(v) && v !== Number(s.effective_value))
          setMutation.mutate({ key: s.key, value: v });
      }}
    />
  );
}

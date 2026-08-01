import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { settingLabel } from "./helpers";
import type { TFn } from "./types";

export function SettingsTableSettingLabel({
  t,
  setting: s,
  showKeys,
}: {
  t: TFn;
  setting: RuntimeSetting;
  showKeys: boolean;
}) {
  return (
    <span className="flex flex-col">
      <span className="flex items-center gap-1.5">
        {s.requires_reprocess && (
          <span
            title="Applies on next ingest"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
          />
        )}
        <span className="font-medium text-slate-800">{settingLabel(t, s)}</span>
      </span>
      {showKeys && (
        <span className="font-mono text-[11px] text-slate-400">{s.key}</span>
      )}
    </span>
  );
}

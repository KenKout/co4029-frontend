import { cn } from "@/lib/utils";
import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { Switch } from "@/components/ui/switch";
import { settingDescription } from "./helpers";
import { NumberField } from "./NumberField";
import { SettingRowLabel } from "./SettingRowLabel";
import { SettingRowValueColumn } from "./SettingRowValueColumn";
import type { SettingsDraft } from "./use-settings-draft";
import { useSettingRow } from "./use-setting-row";

export function SettingRow({
  setting,
  draft,
  orgId,
  showKeys,
}: {
  setting: RuntimeSetting;
  /** Shared with the rest of the page so every view stages into one set. */
  draft: SettingsDraft;
  orgId?: string;
  showKeys: boolean;
}) {
  const controller = useSettingRow(setting, draft, orgId);
  const { t, label, value, isPending, stage, commitNumber } = controller;

  // Split the description into a lead sentence (always shown) + the rest
  // (revealed on demand). The ingest guidance is worth keeping — just not all
  // of it, always, at full width. Split the LOCALISED description so the
  // sentence break lands correctly in the active language.
  const [lead, ...restParts] = settingDescription(t, setting).split(
    /(?<=\.)\s+/,
  );
  const rest = restParts.join(" ").trim();

  // Scope comparison: when editing an org, show the global default it would
  // fall back to alongside the org value.
  const showComparison = orgId !== undefined;
  const globalFallback =
    setting.global_value ?? setting.env_value ?? setting.default_value;

  const control =
    setting.type === "bool" ? (
      <div className="flex items-center gap-2">
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(c) => stage(c)}
          aria-label={label}
        />
        <span className="text-xs text-slate-500">
          {value ? t("admin_settings.ui.on") : t("admin_settings.ui.off")}
        </span>
      </div>
    ) : (
      <div>
        <NumberField
          setting={setting}
          value={String(value)}
          onCommit={commitNumber}
        />
      </div>
    );

  return (
    <div
      className={cn(
        "border-b border-slate-100 py-3.5 transition-colors last:border-b-0",
        isPending &&
          "rounded-lg bg-amber-50/70 ring-1 ring-inset ring-amber-200/80",
      )}
    >
      {isPending && (
        <span className="sr-only">{t("admin_settings.pending.badge")}</span>
      )}
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-2 md:grid-cols-[minmax(0,1fr)_200px]">
        {/* Label + description */}
        <SettingRowLabel
          controller={controller}
          setting={setting}
          showKeys={showKeys}
          lead={lead}
          rest={rest}
        />

        {/* Control column — fixed 200px so every right edge lines up. */}
        <SettingRowValueColumn
          controller={controller}
          showComparison={showComparison}
          globalFallback={globalFallback}
          control={control}
        />
      </div>
    </div>
  );
}

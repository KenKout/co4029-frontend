import type { RuntimeSetting } from "@/lib/api/hooks/admin-settings";
import { HEADER_OFFSET, REPROCESS_NOTE } from "./constants";
import { groupLabel } from "./helpers";
import { SettingRow } from "./SettingRow";
import type { AdminSettingsPageController } from "./use-admin-settings-page";

export function SettingsGroupSection({
  controller,
  group,
  rows,
}: {
  controller: AdminSettingsPageController;
  group: string;
  rows: RuntimeSetting[];
}) {
  const { t, orgId, showKeys, draft } = controller;
  const anyReprocess = rows.some((r) => r.requires_reprocess);

  return (
    <section
      id={`section-${group}`}
      className="rounded-lg border border-slate-200 bg-white"
      style={{ scrollMarginTop: HEADER_OFFSET }}
    >
      {/* Section header — plain (not sticky), so it never
          overlaps or gets overlapped. The section rail handles
          jumping between sections. */}
      <div className="rounded-t-lg border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {groupLabel(t, group)}
          </h2>
          <span className="text-xs text-slate-400">
            {rows.length} setting{rows.length !== 1 ? "s" : ""}
          </span>
        </div>
        {anyReprocess && (
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {REPROCESS_NOTE}
          </p>
        )}
      </div>
      <div className="px-5">
        {rows.map((setting) => (
          <SettingRow
            key={setting.key}
            setting={setting}
            draft={draft}
            orgId={orgId || undefined}
            showKeys={showKeys}
          />
        ))}
      </div>
    </section>
  );
}

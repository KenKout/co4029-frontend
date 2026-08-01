import { SettingsGroupSection } from "./SettingsGroupSection";
import type { AdminSettingsPageController } from "./use-admin-settings-page";

export function SettingsCardList({
  controller,
}: {
  controller: AdminSettingsPageController;
}) {
  const { visibleGroups, grouped } = controller;

  return (
    <div className="mt-4 space-y-6">
      {visibleGroups.map((group) => (
        <SettingsGroupSection
          key={group}
          controller={controller}
          group={group}
          rows={grouped.get(group) ?? []}
        />
      ))}
    </div>
  );
}

import { SettingsSectionRailItem } from "./SettingsSectionRailItem";
import type { AdminSettingsPageController } from "./use-admin-settings-page";

export function SettingsSectionRail({
  controller,
}: {
  controller: AdminSettingsPageController;
}) {
  const { t, visibleGroups, overrideCounts, activeSection, scrollToSection } =
    controller;

  return (
    <aside className="hidden w-[200px] shrink-0 lg:block">
      <div className="sticky top-24">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Sections
        </p>
        <nav className="space-y-0.5">
          {visibleGroups.map((g) => (
            <SettingsSectionRailItem
              key={g}
              t={t}
              group={g}
              count={overrideCounts[g] ?? 0}
              active={g === activeSection}
              onSelect={() => scrollToSection(g)}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

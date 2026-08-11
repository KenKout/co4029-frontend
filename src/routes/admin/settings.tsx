import { cn } from "@/lib/utils";
import { SettingsPageBody } from "./_components/settings/SettingsPageBody";
import { SettingsSectionRail } from "./_components/settings/SettingsSectionRail";
import { SettingsToolbar } from "./_components/settings/SettingsToolbar";
import { useAdminSettingsPage } from "./_components/settings/use-admin-settings-page";

export default function AdminSettingsPage() {
  const controller = useAdminSettingsPage();
  const { t, dense, contentRef } = controller;

  return (
    <div className="px-4 py-6">
      <div className="mx-auto flex max-w-[1440px] gap-8">
        {/* ── Section rail ── */}
        {!dense && <SettingsSectionRail controller={controller} />}

        {/* ── Content ── In table mode the rail is hidden, so drop the width
            cap and let the table fill the (centered) container — otherwise the
            capped column hugs the left edge with dead space on the right. */}
        <div
          ref={contentRef}
          className={cn("min-w-0 flex-1", !dense && "lg:max-w-[1040px]")}
        >
          <h1 className="text-2xl font-semibold text-slate-900">
            {t("admin.settings.title", { defaultValue: "Runtime settings" })}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ingestion and retrieval behaviour, changeable without a deploy.
            Resolves organization → global → environment → built-in.
          </p>

          {/* ── Toolbar ── (not sticky: kept overlapping the section headers) */}
          <SettingsToolbar controller={controller} />

          <SettingsPageBody controller={controller} />
        </div>
      </div>

    </div>
  );
}

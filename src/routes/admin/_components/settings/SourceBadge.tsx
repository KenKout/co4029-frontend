import { useTranslation } from "react-i18next";
import type { SettingSource } from "@/lib/api/hooks/admin-settings";
import { SOURCE_META } from "./constants";

export function SourceBadge({ source }: { source: SettingSource }) {
  const { t } = useTranslation();
  const m = SOURCE_META[source];
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${m.badge}`}
    >
      {t(`admin_settings.source.${source}`, { defaultValue: m.label })}
    </span>
  );
}

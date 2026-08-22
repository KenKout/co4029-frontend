import { useTranslation } from "react-i18next";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import { TAB_DEFS } from "./constants";
import type { TabKey } from "./types";

/**
 * The courses / students / progress tab strip. Driven off `TAB_DEFS`, rendered by
 * the shared outlined <Tabs> so this screen stays in step with the rest of the
 * app.
 */
export function TabBar({
  tab,
  onSelect,
}: {
  tab: TabKey;
  onSelect: (key: TabKey) => void;
}) {
  const { t } = useTranslation();

  const tabs: TabDef<TabKey>[] = TAB_DEFS.map((tabDef) => ({
    key: tabDef.key,
    label: t(`management_career_path_detail.tabs.${tabDef.key}`, {
      defaultValue: tabDef.key === "programs" ? "Program" : `${tabDef.key[0]?.toUpperCase()}${tabDef.key.slice(1)}`,
    }),
    icon: tabDef.icon,
  }));

  return (
    <Tabs tabs={tabs} value={tab} onChange={onSelect} variant="outlined" />
  );
}

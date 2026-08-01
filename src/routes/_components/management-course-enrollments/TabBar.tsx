import { useTranslation } from "react-i18next";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import { TABS } from "./constants";
import type { TabKey } from "./types";

/**
 * The roster / bulk / codes tab strip. Driven off `TABS`, rendered by the shared
 * outlined <Tabs> so this screen stays in step with the rest of the app.
 */
export function TabBar({
  tab,
  onSelect,
}: {
  tab: TabKey;
  onSelect: (key: TabKey) => void;
}) {
  const { t } = useTranslation();

  const tabs: TabDef<TabKey>[] = TABS.map((tabItem) => ({
    key: tabItem.key,
    label: t(tabItem.labelKey),
    icon: tabItem.icon,
  }));

  return (
    <Tabs tabs={tabs} value={tab} onChange={onSelect} variant="outlined" />
  );
}

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { TABS } from "./constants";
import type { TabKey } from "./types";

/**
 * The roster / bulk / codes tab strip. Driven off `TABS` so the markup below is
 * the single rendering of a tab button.
 */
export function TabBar({
  tab,
  onSelect,
}: {
  tab: TabKey;
  onSelect: (key: TabKey) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 border-b border-m3-outline-variant/30">
      {TABS.map((tabItem) => {
        const Icon = tabItem.icon;
        const active = tabItem.key === tab;
        return (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => onSelect(tabItem.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer",
              active
                ? "border-m3-primary text-m3-primary"
                : "border-transparent text-m3-on-surface-variant hover:text-m3-on-surface",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(tabItem.labelKey)}
          </button>
        );
      })}
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { TAB_DEFS } from "./constants";
import type { TabKey } from "./types";

/**
 * The courses / students / progress tab strip. Driven off `TAB_DEFS` so the
 * markup below is the single rendering of a tab button.
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
      {TAB_DEFS.map((tabDef) => {
        const Icon = tabDef.icon;
        const active = tabDef.key === tab;
        return (
          <button
            key={tabDef.key}
            type="button"
            onClick={() => onSelect(tabDef.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer",
              active
                ? "border-m3-primary text-m3-primary"
                : "border-transparent text-m3-on-surface-variant hover:text-m3-on-surface",
            )}
          >
            <Icon className="h-4 w-4" />
            {t(`management_career_path_detail.tabs.${tabDef.key}`)}
          </button>
        );
      })}
    </div>
  );
}

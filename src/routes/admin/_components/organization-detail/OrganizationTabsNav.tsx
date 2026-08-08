import { useTranslation } from "react-i18next";
import { TAB_KEYS } from "./constants";
import type { TabKey } from "./types";
import { Button } from "@/components/ui/button";

/**
 * Underline tab bar for the four detail panes.
 */
export function OrganizationTabsNav({
  tab,
  onTabChange,
}: {
  tab: TabKey;
  onTabChange: (next: TabKey) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-b border-m3-outline-variant/40 flex gap-1 overflow-x-auto">
      {TAB_KEYS.map((key) => (
        <Button variant="ghost"
          key={key}
          type="button"
          onClick={() => onTabChange(key)}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            tab === key
              ? "border-m3-primary text-m3-primary"
              : "border-transparent text-text-muted hover:text-text-strong"
          }`}
        >
          {t(`admin.organizations.tabs.${key}`)}
        </Button>
      ))}
    </div>
  );
}

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { TFunction } from "i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SideNavCollapseToggle({
  collapsed,
  onToggle,
  t,
}: {
  collapsed: boolean;
  onToggle: () => void;
  t: TFunction;
}) {
  return (
    <div
      className={cn(
        "px-2 py-3 border-t border-border shrink-0",
        collapsed && "flex justify-center",
      )}
    >
      <Button variant="ghost"
        type="button"
        onClick={onToggle}
        title={
          collapsed
            ? t("sidebar.expand", { defaultValue: "Expand" })
            : undefined
        }
        aria-label={
          collapsed
            ? t("sidebar.expand", { defaultValue: "Expand" })
            : t("sidebar.collapse", { defaultValue: "Collapse" })
        }
        className={cn(
          "cursor-pointer flex items-center gap-3 py-2 rounded-md transition-colors duration-150 text-text-subtle hover:text-primary hover:bg-surface-muted bg-transparent border-0 h-auto whitespace-normal",
          collapsed ? "justify-center w-10 h-10 px-0" : "w-full px-3 h-auto whitespace-normal",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4 flex-shrink-0" />
        ) : (
          <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
        )}
        {!collapsed && (
          <span className="text-sm font-medium">
            {t("sidebar.collapse", { defaultValue: "Collapse" })}
          </span>
        )}
      </Button>
    </div>
  );
}

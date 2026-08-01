import type { TFunction } from "i18next";
import type { NavGroup, NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { SideNavItem } from "./nav-item";

export interface SideNavGroupsProps {
  navGroups: NavGroup[];
  collapsed: boolean;
  t: TFunction;
  isItemActive: (item: NavItem) => boolean;
  labelOf: (item: NavItem) => string;
}

export function SideNavGroups({
  navGroups,
  collapsed,
  t,
  isItemActive,
  labelOf,
}: SideNavGroupsProps) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 pt-4 space-y-4 pb-2">
      {navGroups.map((group) => (
        <div key={group.label}>
          {/* Group label — only when expanded */}
          {!collapsed && (
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-text-subtle select-none">
              {t(group.i18nKey, { defaultValue: group.label })}
            </p>
          )}
          {/* Divider — only when collapsed */}
          {collapsed && <div className="w-6 h-px bg-border mx-auto mb-1" />}
          <div
            className={cn("flex flex-col gap-0.5", collapsed && "items-center")}
          >
            {group.items.map((item) => (
              <SideNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                isActive={isItemActive(item)}
                label={labelOf(item)}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

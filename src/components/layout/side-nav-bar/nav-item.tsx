import { Link } from "@tanstack/react-router";
import type { NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function SideNavItem({
  item,
  collapsed,
  isActive,
  label,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  label: string;
}) {
  return (
    <Link
      to={item.href}
      title={collapsed ? label : undefined}
      className={cn(
        "cursor-pointer flex items-center gap-3 py-2 rounded-md transition-all duration-150",
        collapsed ? "justify-center px-0 mx-auto w-10 h-10" : "px-3",
        isActive
          ? collapsed
            ? "text-violet-600 bg-violet-50 rounded-xl"
            : "text-violet-600 bg-violet-50 border-r-2 border-violet-600 rounded-l-xl"
          : "text-text-muted hover:text-primary hover:bg-surface-muted",
        !collapsed && isActive && "hover:translate-x-1",
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}
    </Link>
  );
}

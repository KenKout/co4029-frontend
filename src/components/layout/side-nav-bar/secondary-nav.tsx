import { Link } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { logoutNavItem, type NavItem, secondaryNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Shared row styling for the Help link and the Log Out button. */
function rowClasses(collapsed: boolean, danger: boolean) {
  return cn(
    "cursor-pointer flex items-center gap-3 py-2 rounded-md transition-colors duration-150",
    // justify-start only matters for the Button (Log Out): the system Button's
    // cva base bakes in justify-center, which silently centred the row while
    // the Help link above it stayed left-aligned.
    collapsed ? "justify-center w-10 h-10 px-0 mx-auto" : "px-3 justify-start",
    danger
      ? "text-text-subtle hover:text-danger hover:bg-danger/10"
      : "text-text-subtle hover:text-primary hover:bg-surface-muted",
  );
}

export interface SideNavSecondaryProps {
  collapsed: boolean;
  isLoggingOut: boolean;
  onLogoutClick: () => void;
  labelOf: (item: NavItem) => string;
}

export function SideNavSecondary({
  collapsed,
  isLoggingOut,
  onLogoutClick,
  labelOf,
}: SideNavSecondaryProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 px-2 py-3 border-t border-border shrink-0",
        collapsed && "items-center",
      )}
    >
      {secondaryNavItems.map((item) => (
        <Link
          key={item.label}
          to={item.href}
          title={collapsed ? labelOf(item) : undefined}
          data-nav-item
          className={rowClasses(collapsed, false)}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium">{labelOf(item)}</span>
          )}
        </Link>
      ))}

      <Button
        variant="ghost"
        type="button"
        title={collapsed ? labelOf(logoutNavItem) : undefined}
        data-nav-item
        onClick={onLogoutClick}
        disabled={isLoggingOut}
        className={cn(
          rowClasses(collapsed, true),
          "w-full text-left bg-transparent border-0 disabled:opacity-60 disabled:cursor-not-allowed",
          collapsed && "w-10",
        )}
      >
        {isLoggingOut ? (
          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4 flex-shrink-0" />
        )}
        {!collapsed && (
          <span className="text-sm font-medium">{labelOf(logoutNavItem)}</span>
        )}
      </Button>
    </div>
  );
}

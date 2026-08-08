import { Link } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { type NavItem, secondaryNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const isLogoutItem = (item: NavItem) => item.label === "Log Out";

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
      {secondaryNavItems.map((item) => {
        const label = labelOf(item);
        const baseClasses = cn(
          "cursor-pointer flex items-center gap-3 py-2 rounded-md transition-colors duration-150",
          collapsed ? "justify-center w-10 h-10 px-0 mx-auto" : "px-3",
          isLogoutItem(item)
            ? "text-text-subtle hover:text-danger hover:bg-danger/10"
            : "text-text-subtle hover:text-primary hover:bg-surface-muted",
        );

        if (isLogoutItem(item)) {
          return (
            <Button variant="ghost"
              key={item.label}
              type="button"
              title={collapsed ? label : undefined}
              onClick={onLogoutClick}
              disabled={isLoggingOut}
              className={cn(
                baseClasses,
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
                <span className="text-sm font-medium">{label}</span>
              )}
            </Button>
          );
        }

        return (
          <Link
            key={item.label}
            to={item.href}
            title={collapsed ? label : undefined}
            className={baseClasses}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </Link>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { type NavItem, type NavGroup } from "@/lib/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { SideNavCollapseToggle } from "./side-nav-bar/collapse-toggle";
import { SideNavGroups } from "./side-nav-bar/nav-groups";
import { SideNavLogo } from "./side-nav-bar/logo";
import { SideNavLogoutDialog } from "./side-nav-bar/logout-dialog";
import { SideNavSecondary } from "./side-nav-bar/secondary-nav";

type SidebarRole = "student" | "teacher" | "manager" | "admin";

interface SideNavBarProps {
  navGroups: NavGroup[];
  role: SidebarRole;
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Mobile drawer: when true the (otherwise hidden) sidebar slides in. */
  mobileOpen?: boolean;
}

export default function SideNavBar({
  navGroups,
  role: _role,
  className,
  collapsed = false,
  onToggle,
  mobileOpen = false,
}: SideNavBarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const labelOf = (item: NavItem) =>
    item.i18nKey ? t(item.i18nKey, { defaultValue: item.label }) : item.label;

  async function handleConfirmLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      window.location.replace("/login");
    }
  }

  function isItemActive(item: NavItem) {
    return item.exact
      ? location.pathname === item.href
      : location.pathname === item.href ||
          location.pathname.startsWith(item.href + "/");
  }

  // Inside the mobile drawer the nav always renders expanded (w-64), even if
  // the desktop rail is collapsed; outside it the desktop `collapsed` state
  // applies.
  const displayCollapsed = !(!collapsed || mobileOpen);

  return (
    <>
      <aside
        className={cn(
          "flex flex-col h-screen bg-white border-r border-border fixed left-0 top-0 z-40 transition-all duration-300 shadow-sm w-64",
          collapsed ? "md:w-16" : "md:w-64",
          "-translate-x-full md:translate-x-0",
          mobileOpen && "translate-x-0",
          className,
        )}
      >
        {/* Logo */}
        <SideNavLogo collapsed={displayCollapsed} />

        {/* Nav groups */}
        <SideNavGroups
          navGroups={navGroups}
          collapsed={displayCollapsed}
          t={t}
          isItemActive={isItemActive}
          labelOf={labelOf}
        />

        {/* Secondary (help + logout) */}
        <SideNavSecondary
          collapsed={displayCollapsed}
          isLoggingOut={isLoggingOut}
          onLogoutClick={() => setConfirmOpen(true)}
          labelOf={labelOf}
        />

        {/* Collapse toggle — bottom row */}
        {onToggle && (
          <div className="hidden md:block">
            <SideNavCollapseToggle
              collapsed={displayCollapsed}
              onToggle={onToggle}
              t={t}
            />
          </div>
        )}
      </aside>

      <SideNavLogoutDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (isLoggingOut && !next) return;
          setConfirmOpen(next);
        }}
        isLoggingOut={isLoggingOut}
        onConfirm={() => void handleConfirmLogout()}
        t={t}
      />
    </>
  );
}

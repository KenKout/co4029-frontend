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
}

export default function SideNavBar({
  navGroups,
  role: _role,
  className,
  collapsed = false,
  onToggle,
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

  return (
    <>
      <aside
        className={cn(
          "flex flex-col h-screen bg-white border-r border-border fixed left-0 top-0 z-40 transition-all duration-300 shadow-sm",
          collapsed ? "w-16" : "w-64",
          className,
        )}
      >
        {/* Logo */}
        <SideNavLogo collapsed={collapsed} />

        {/* Nav groups */}
        <SideNavGroups
          navGroups={navGroups}
          collapsed={collapsed}
          t={t}
          isItemActive={isItemActive}
          labelOf={labelOf}
        />

        {/* Secondary (help + logout) */}
        <SideNavSecondary
          collapsed={collapsed}
          isLoggingOut={isLoggingOut}
          onLogoutClick={() => setConfirmOpen(true)}
          labelOf={labelOf}
        />

        {/* Collapse toggle — bottom row */}
        {onToggle && (
          <SideNavCollapseToggle
            collapsed={collapsed}
            onToggle={onToggle}
            t={t}
          />
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

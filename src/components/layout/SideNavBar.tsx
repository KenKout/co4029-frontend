import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  LogOut,
  LayoutDashboard,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  type NavItem,
  type NavGroup,
  secondaryNavItems,
} from "@/lib/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type SidebarRole = "student" | "teacher" | "admin";

interface RoleMeta {
  label: string;
  icon: typeof LayoutDashboard;
  color: string;
  bg: string;
}

const ROLE_META: Record<SidebarRole, RoleMeta> = {
  student: {
    label: "sections.student",
    icon: LayoutDashboard,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
  },
  teacher: {
    label: "sections.teacher",
    icon: Briefcase,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  admin: {
    label: "sections.admin",
    icon: ShieldCheck,
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
  },
};

interface SideNavBarProps {
  navGroups: NavGroup[];
  role: SidebarRole;
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function SideNavBar({
  navGroups,
  role,
  className,
  collapsed = false,
  onToggle,
}: SideNavBarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const meta = ROLE_META[role];
  const RoleIcon = meta.icon;

  const labelOf = (item: NavItem) =>
    item.i18nKey ? t(item.i18nKey, { defaultValue: item.label }) : item.label;

  const isLogoutItem = (item: NavItem) => item.label === "Log Out";

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

  function renderNavItem(item: NavItem) {
    const isActive = isItemActive(item);
    const label = labelOf(item);
    return (
      <Link
        key={item.href}
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
        <div
          className={cn(
            "h-16 flex items-center border-b border-border px-4 shrink-0",
            collapsed ? "justify-center" : "justify-start",
          )}
        >
          {collapsed ? (
            <Link
              to="/"
              className="text-base font-bold text-primary tracking-tight font-heading cursor-pointer"
            >
              aB
            </Link>
          ) : (
            <Link to="/" className="flex flex-col cursor-pointer min-w-0">
              <span className="text-lg font-bold text-primary tracking-tight font-heading">
                aBridgeAI
              </span>
              <span className="text-[9px] uppercase tracking-widest text-text-subtle">
                The Cognitive Conduit
              </span>
            </Link>
          )}
        </div>

        {/* Nav groups */}
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
                className={cn(
                  "flex flex-col gap-0.5",
                  collapsed && "items-center",
                )}
              >
                {group.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </nav>

        {/* Secondary (help + logout) */}
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
                <button
                  key={item.label}
                  type="button"
                  title={collapsed ? label : undefined}
                  onClick={() => setConfirmOpen(true)}
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
                </button>
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
                {!collapsed && (
                  <span className="text-sm font-medium">{label}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Collapse toggle — bottom row */}
        {onToggle && (
          <div
            className={cn(
              "px-2 py-3 border-t border-border shrink-0",
              collapsed && "flex justify-center",
            )}
          >
            <button
              type="button"
              onClick={onToggle}
              title={collapsed ? t("sidebar.expand", { defaultValue: "Expand" }) : undefined}
              aria-label={
                collapsed
                  ? t("sidebar.expand", { defaultValue: "Expand" })
                  : t("sidebar.collapse", { defaultValue: "Collapse" })
              }
              className={cn(
                "cursor-pointer flex items-center gap-3 py-2 rounded-md transition-colors duration-150 text-text-subtle hover:text-primary hover:bg-surface-muted bg-transparent border-0",
                collapsed ? "justify-center w-10 h-10 px-0" : "w-full px-3",
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
            </button>
          </div>
        )}
      </aside>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (isLoggingOut && !next) return;
          setConfirmOpen(next);
        }}
        title={t("logout_confirm.title")}
        description={t("logout_confirm.description")}
        confirmLabel={
          isLoggingOut ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("logout_confirm.confirming")}
            </span>
          ) : (
            t("logout_confirm.confirm")
          )
        }
        cancelLabel={t("logout_confirm.cancel")}
        confirmVariant="destructive"
        isPending={isLoggingOut}
        onConfirm={() => void handleConfirmLogout()}
      />
    </>
  );
}

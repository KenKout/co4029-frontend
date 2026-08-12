import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Loader2,
  LayoutDashboard,
  Menu,
  Settings,
  LogOut,
  User,
  Command,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUnreadCount } from "@/lib/api/hooks/notifications";
import { getAuthDisplayName, getAuthUserInitials } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { openShortcutPalette } from "@/lib/shortcuts";
import LanguageSwitcher from "./LanguageSwitcher";
import SectionSwitcher from "./SectionSwitcher";

/** Avatar-dropdown entry that opens the global shortcut palette. */
function ShortcutPaletteMenuItem() {
  const { t } = useTranslation();
  return (
    <DropdownMenuItem
      className="flex items-center rounded-md px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-primary-soft focus:bg-primary-soft focus:text-primary"
      onClick={openShortcutPalette}
    >
      <Command className="h-4 w-4 text-m3-on-surface-variant" />
      <span className="text-sm font-medium">{t("shortcuts.menu_entry")}</span>
      <kbd className="ml-auto rounded-md border border-m3-outline-variant/50 bg-m3-surface px-1.5 py-0.5 text-[11px] font-medium text-m3-on-surface-variant tabular-nums">
        Ctrl+Shift+P
      </kbd>
    </DropdownMenuItem>
  );
}

async function performLogout(logout: () => Promise<void>) {
  try {
    await logout();
  } finally {
    window.location.replace("/login");
  }
}

interface ContentTopBarProps {
  /** Mobile only: opens/closes the sidebar drawer. */
  onMenuToggle?: () => void;
  mobileNavOpen?: boolean;
}

/** Mobile nav drawer toggle — top-right corner. The sidebar rail is hidden
 *  on phones (content gets the full width); this opens it as an overlay. */
function MobileNavToggle({
  t,
  open,
  onToggle,
}: {
  t: (key: string, opts?: { defaultValue?: string }) => string;
  open?: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden shrink-0 h-10 w-10 text-m3-on-surface-variant hover:bg-m3-surface-container"
      onClick={onToggle}
      aria-label={
        open
          ? t("nav.close_menu", { defaultValue: "Close menu" })
          : t("nav.open_menu", { defaultValue: "Open menu" })
      }
      aria-expanded={open}
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );
}

export default function ContentTopBar({
  onMenuToggle,
  mobileNavOpen,
}: ContentTopBarProps) {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const displayName = getAuthDisplayName(user);
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.unread ?? 0;

  async function handleConfirmLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await performLogout(logout);
  }

  return (
    <header className="w-full sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-border flex items-center justify-between gap-4 px-8 h-16">
      <SectionSwitcher />

      <div className="flex items-center gap-2 ml-auto">
        <LanguageSwitcher />

        <Link
          to="/notifications"
          className="relative text-text-muted cursor-pointer hover:bg-surface-muted hover:text-primary p-2.5 rounded-md transition-colors"
          aria-label={
            unreadCount > 0
              ? t("notifications.bell_aria_unread", {
                  count: unreadCount,
                  defaultValue: "Notifications, {{count}} unread",
                })
              : t("notifications.bell_aria", { defaultValue: "Notifications" })
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors hover:opacity-90"
            aria-label="User menu"
          >
            <Avatar className="h-9 w-9 ring-2 ring-surface-elev shadow-sm">
              {user?.profile?.avatar_url && (
                <AvatarImage src={user.profile.avatar_url} alt="" />
              )}
              <AvatarFallback className="bg-primary text-white text-xs font-bold">
                {getAuthUserInitials(user)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-56 rounded-lg bg-card shadow-editorial border border-border p-1.5"
          >
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-m3-on-surface truncate">
                {displayName}
              </p>
              <p className="text-xs text-m3-on-surface-variant truncate mt-0.5">
                {user?.primary_email}
              </p>
            </div>

            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuGroup>
              <DropdownMenuItem
                className="flex items-center rounded-md px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-primary-soft focus:bg-primary-soft focus:text-primary"
                render={<Link to="/dashboard" />}
              >
                <LayoutDashboard className="h-4 w-4 text-m3-on-surface-variant" />
                <span className="text-sm font-medium">
                  {t("nav.dashboard")}
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center rounded-md px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-primary-soft focus:bg-primary-soft focus:text-primary"
                render={<Link to="/settings" />}
              >
                <Settings className="h-4 w-4 text-m3-on-surface-variant" />
                <span className="text-sm font-medium">
                  {t("nav.settings")}
                </span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="flex items-center rounded-md px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-primary-soft focus:bg-primary-soft focus:text-primary"
                render={<Link to="/profile" />}
              >
                <User className="h-4 w-4 text-m3-on-surface-variant" />
                <span className="text-sm font-medium">
                  {t("nav.profile")}
                </span>
              </DropdownMenuItem>

              <ShortcutPaletteMenuItem />
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuItem
              variant="destructive"
              className="rounded-md px-3 py-2 gap-3 cursor-pointer"
              disabled={isLoggingOut}
              onClick={() => setConfirmOpen(true)}
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{t("nav.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile nav drawer toggle — top-right corner. */}
        {onMenuToggle && (
          <MobileNavToggle
            t={t}
            open={mobileNavOpen}
            onToggle={onMenuToggle}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          // Block dismissal while the logout request is in flight.
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
    </header>
  );
}

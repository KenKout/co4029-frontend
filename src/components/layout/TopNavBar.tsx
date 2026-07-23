import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Loader2,
  LayoutDashboard,
  Settings,
  User,
  LogOut,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUnreadCount } from "@/lib/api/hooks/notifications";
import { getAuthDisplayName, getAuthUserInitials } from "@/lib/auth";
import { topNavLinks } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function TopNavBar() {
  const { isAuthenticated, logout, status, user } = useAuth();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const location = useLocation();
  const displayName = getAuthDisplayName(user);
  const { data: unread } = useUnreadCount({ enabled: isAuthenticated });
  const unreadCount = unread?.unread ?? 0;

  async function handleConfirmLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-8 h-16 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-primary font-heading cursor-pointer"
          >
            aBridgeAI
          </Link>
          <div className="hidden md:flex gap-2 items-center">
            {topNavLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "font-heading tracking-tight text-sm font-semibold transition-all duration-200 cursor-pointer",
                  "px-3 py-1.5 rounded-md hover:bg-m3-primary-fixed/40 hover:opacity-90",
                  location.pathname === link.href
                    ? "text-primary"
                    : "text-text-muted hover:text-primary",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {status === "loading" ? (
            <div className="h-10 w-28 rounded-full bg-m3-primary-fixed/60 animate-pulse" />
          ) : isAuthenticated ? (
            <>
              <Link
                to="/notifications"
                className="relative text-m3-on-surface-variant cursor-pointer hover:bg-m3-primary-fixed p-2.5 rounded-full transition-colors"
                aria-label={
                  unreadCount > 0
                    ? t("notifications.bell_aria_unread", {
                        count: unreadCount,
                        defaultValue: "Notifications, {{count}} unread",
                      })
                    : t("notifications.bell_aria", {
                        defaultValue: "Notifications",
                      })
                }
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-m3-secondary px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-m3-secondary focus-visible:ring-offset-2 transition-all hover:opacity-90"
                  aria-label="User menu"
                >
                  <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm">
                    <AvatarFallback className="bg-m3-primary text-white text-xs font-bold">
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

                  <DropdownMenuSeparator className="bg-m3-outline-variant/15" />

                  <DropdownMenuGroup>
                    <DropdownMenuItem className="rounded-lg px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-m3-primary-fixed focus:bg-m3-primary-fixed focus:text-m3-primary">
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-3 w-full"
                      >
                        <LayoutDashboard className="h-4 w-4 text-m3-on-surface-variant" />
                        <span className="text-sm font-medium">
                          {t("nav.dashboard")}
                        </span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="rounded-lg px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-m3-primary-fixed focus:bg-m3-primary-fixed focus:text-m3-primary">
                      <Link
                        to="/settings"
                        className="flex items-center gap-3 w-full"
                      >
                        <Settings className="h-4 w-4 text-m3-on-surface-variant" />
                        <span className="text-sm font-medium">
                          {t("nav.settings")}
                        </span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="rounded-lg px-3 py-2 gap-3 cursor-pointer text-m3-on-surface hover:bg-m3-primary-fixed focus:bg-m3-primary-fixed focus:text-m3-primary">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 w-full"
                      >
                        <User className="h-4 w-4 text-m3-on-surface-variant" />
                        <span className="text-sm font-medium">
                          {t("nav.profile")}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator className="bg-m3-outline-variant/15" />

                  <DropdownMenuItem
                    variant="destructive"
                    className="rounded-lg px-3 py-2 gap-3 cursor-pointer"
                    disabled={isLoggingOut}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {isLoggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {t("nav.logout")}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link to="/login" search={{ next: undefined }}>
              <Button className="rounded-full px-5 font-semibold">
                Sign In
              </Button>
            </Link>
          )}
        </div>
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
    </nav>
  );
}

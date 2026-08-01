import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUnreadCount } from "@/lib/api/hooks/notifications";
import { getAuthDisplayName } from "@/lib/auth";
import { TopNavBell } from "./top-nav-bar/notification-bell";
import { TopNavLinks } from "./top-nav-bar/nav-links";
import { TopNavUserMenu } from "./top-nav-bar/user-menu";

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
          <TopNavLinks pathname={location.pathname} />
        </div>

        <div className="flex items-center gap-4">
          {status === "loading" ? (
            <div className="h-10 w-28 rounded-full bg-m3-primary-fixed/60 animate-pulse" />
          ) : isAuthenticated ? (
            <>
              <TopNavBell unreadCount={unreadCount} t={t} />

              <TopNavUserMenu
                user={user}
                displayName={displayName}
                isLoggingOut={isLoggingOut}
                onLogoutClick={() => setConfirmOpen(true)}
                t={t}
              />
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

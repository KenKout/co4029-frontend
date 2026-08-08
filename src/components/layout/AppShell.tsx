import { useCallback, useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { clearAuthSession } from "@/lib/auth";
import { useNotificationInboxSync } from "@/lib/api/hooks/notifications";
import type { Notification } from "@/lib/api/types";
import SideNavBar from "./SideNavBar";
import ContentTopBar from "./ContentTopBar";
import { type NavGroup } from "@/lib/navigation";

type SidebarRole = "student" | "teacher" | "manager" | "admin";

interface AppShellProps {
  children: React.ReactNode;
  navGroups: NavGroup[];
  role: SidebarRole;
}

// If the auth check stalls (backend unreachable, network drop, etc.) we
// give up after this many ms and force the user back to /login instead of
// leaving them on the "Checking your session..." spinner forever.
const SESSION_CHECK_TIMEOUT_MS = 8_000;

export default function AppShell({ children, navGroups, role }: AppShellProps) {
  const { status, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const [stalled, setStalled] = useState(false);
  // Immersive mode: an interview session is actually running, so the app nav
  // sidebar is removed entirely (not merely collapsed) and the workspace takes
  // the full viewport width. Driven by events from the interview page rather
  // than the route alone — the pre-start lobby keeps normal navigation.
  const [immersive, setImmersive] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const routerLocation = useRouterState({ select: (s) => s.location });
  const isInterviewWorkspace = /^\/courses\/[^/]+\/interview\/[^/]+/.test(
    routerLocation.pathname,
  );

  // Realtime arrival toast: the inbox-sync hook watches the polled unread
  // count and hands us the notifications that actually arrived; we surface
  // them as a tappable toast that deep-links into the inbox.
  const handleNewNotifications = useCallback(
    (items: Notification[]) => {
      const first = items[0];
      if (!first) return;
      const single = items.length === 1;
      toast.info(
        single
          ? t("notifications.realtime_title_one")
          : t("notifications.realtime_title_other", { count: items.length }),
        {
          description: single
            ? (first.body ?? first.title).slice(0, 120)
            : items
                .map((n) => n.title)
                .join(", ")
                .slice(0, 120),
          action: {
            label: t("notifications.realtime_view"),
            onClick: () => void navigate({ to: "/notifications" }),
          },
        },
      );
    },
    [t, navigate],
  );
  useNotificationInboxSync({ onNew: handleNewNotifications });

  useEffect(() => {
    const enterImmersive = () => {
      setCollapsed(true);
      setImmersive(true);
    };
    const exitImmersive = () => setImmersive(false);
    window.addEventListener("abridge:interview-started", enterImmersive);
    window.addEventListener("abridge:interview-ended", exitImmersive);
    return () => {
      window.removeEventListener("abridge:interview-started", enterImmersive);
      window.removeEventListener("abridge:interview-ended", exitImmersive);
    };
  }, []);

  // Leaving the interview route always restores the normal shell, even if the
  // page unmounted without dispatching its end event (hard navigation, crash).
  useEffect(() => {
    if (!isInterviewWorkspace) setImmersive(false);
  }, [isInterviewWorkspace]);

  useEffect(() => {
    if (status === "unauthenticated") {
      const search = routerLocation.search as { next?: string | null };
      const next = routerLocation.pathname.startsWith("/login")
        ? (search.next ?? undefined)
        : routerLocation.href;

      void navigate({
        to: "/login",
        search: { next },
        replace: true,
      });
    }
  }, [status, navigate, routerLocation]);

  // Safety net: if we stay in "loading" for too long, treat the session as
  // dead, wipe local credentials, and route to /login. This handles the case
  // where the backend never responds.
  useEffect(() => {
    if (status !== "loading") {
      setStalled(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setStalled(true);
    }, SESSION_CHECK_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!stalled) return;

    clearAuthSession();
    void logout().catch(() => {});

    const search = routerLocation.search as { next?: string | null };
    const next = routerLocation.pathname.startsWith("/login")
      ? (search.next ?? undefined)
      : routerLocation.href;

    void navigate({
      to: "/login",
      search: { next },
      replace: true,
    });
  }, [stalled, logout, navigate, routerLocation]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-m3-surface px-6">
        <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 text-sm font-semibold text-m3-on-surface shadow-editorial border border-border">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>
            {status === "unauthenticated" || stalled
              ? "Redirecting to sign in..."
              : "Checking your session..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-m3-surface">
      {/* During a live interview the nav sidebar is unmounted entirely so the
          candidate has no chrome to click away into (and no left gutter). */}
      {!immersive && (
        <SideNavBar
          navGroups={navGroups}
          role={role}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      )}

      {/* Backdrop — mobile only, when sidebar expanded */}
      {!immersive && !collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      <main
        className={cn(
          "relative min-h-screen transition-all duration-300 bg-white",
          immersive ? "ml-0" : "ml-16",
          !immersive && !collapsed && "md:ml-64",
        )}
      >
        {!isInterviewWorkspace && (
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(0_0_0/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(0_0_0/0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        )}
        {!isInterviewWorkspace && <ContentTopBar />}
        <div
          className={cn(
            "relative",
            isInterviewWorkspace
              ? "min-h-screen"
              : "px-4 py-6 sm:px-6 lg:px-10",
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

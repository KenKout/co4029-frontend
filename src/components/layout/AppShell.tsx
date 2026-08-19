import { useCallback, useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNotificationInboxSync } from "@/lib/api/hooks/notifications";
import type { Notification } from "@/lib/api/types";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { useSessionGuard } from "./use-session-guard";
import SideNavBar from "./SideNavBar";
import ContentTopBar from "./ContentTopBar";
import { GlobalShortcuts } from "@/components/shortcuts/GlobalShortcuts";
import { type NavGroup } from "@/lib/navigation";

type SidebarRole = "student" | "teacher" | "manager" | "admin";

interface AppShellProps {
  children: React.ReactNode;
  navGroups: NavGroup[];
  role: SidebarRole;
}

export default function AppShell({ children, navGroups, role }: AppShellProps) {
  const { status, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const { stalled } = useSessionGuard(status, logout);
  // Immersive = live interview: nav sidebar removed, full-viewport workspace.
  const [immersive, setImmersive] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const routerLocation = useRouterState({ select: (s) => s.location });
  const isInterviewWorkspace =
    /^\/courses\/[^/]+\/interview\/[^/]+/.test(routerLocation.pathname);

  // Realtime arrival toast: inbox-sync hands us newly polled notifications;
  // surface them as a tappable toast that deep-links into the inbox.
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

  useEffect(() => {
    if (!isInterviewWorkspace) setImmersive(false);
  }, [isInterviewWorkspace]);

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
      <GlobalShortcuts />
      {/* During a live interview the nav sidebar is unmounted entirely. */}
      {!immersive && (
        <SideNavBar
          navGroups={navGroups}
          role={role}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      )}

      <main
        className={cn(
          "relative min-h-screen transition-all duration-300 bg-white",
          immersive ? "ml-0" : "ml-0 md:ml-16",
          !immersive && !collapsed && "md:ml-64",
        )}
      >
        {!isInterviewWorkspace && (
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(0_0_0/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(0_0_0/0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        )}
        {!isInterviewWorkspace && <ContentTopBar navGroups={navGroups} />}
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
      {!immersive && <ScrollToTop />}
    </div>
  );
}

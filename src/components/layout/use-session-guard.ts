import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { clearAuthSession } from "@/lib/auth";

// If the auth check stalls (backend unreachable, network drop, etc.) we
// give up after this many ms and force the user back to /login instead of
// leaving them on the "Checking your session..." spinner forever.
const SESSION_CHECK_TIMEOUT_MS = 8_000;

/**
 * Session guard for the app shell: bounce to /login when unauthenticated,
 * and treat a session check that hangs too long as a dead session (wipe
 * local credentials, route to /login).
 */
export function useSessionGuard(
  status: "loading" | "authenticated" | "unauthenticated",
  logout: () => Promise<void>,
) {
  const navigate = useNavigate();
  const routerLocation = useRouterState({ select: (s) => s.location });
  const [stalled, setStalled] = useState(false);

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

  return { stalled };
}

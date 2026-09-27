import { useEffect } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import { DesktopOnlyBanner } from "@/components/ui/desktop-only-banner";
import { PermissionDenied } from "@/components/ui/permission-denied";
import GuardedSpinner from "./_components/authenticated-layout/GuardedSpinner";
import { useRouteAccess } from "./_components/authenticated-layout/use-route-access";

export default function AuthenticatedLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { navGroups, role, showDesktopBanner, showGuardedSpinner, denied } =
    useRouteAccess();

  useEffect(() => {
    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    canonical?.setAttribute("href", `https://abridgeai.tech${pathname}`);
    return () => {
      canonical?.setAttribute("href", "https://abridgeai.tech/");
    };
  }, [pathname]);

  return (
    <AppShell navGroups={navGroups} role={role}>
      {showDesktopBanner ? <DesktopOnlyBanner /> : null}
      {showGuardedSpinner ? <GuardedSpinner permsReady={false} /> : null}
      {!showGuardedSpinner && denied ? <PermissionDenied /> : null}
      {!showGuardedSpinner && !denied ? <Outlet /> : null}
    </AppShell>
  );
}

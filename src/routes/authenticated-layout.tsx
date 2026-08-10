import { Outlet } from "@tanstack/react-router";
import AppShell from "@/components/layout/AppShell";
import { DesktopOnlyBanner } from "@/components/ui/desktop-only-banner";
import { PermissionDenied } from "@/components/ui/permission-denied";
import GuardedSpinner from "./_components/authenticated-layout/GuardedSpinner";
import { useRouteAccess } from "./_components/authenticated-layout/use-route-access";

export default function AuthenticatedLayout() {
  const { navGroups, role, showDesktopBanner, showGuardedSpinner, denied } =
    useRouteAccess();

  return (
    <AppShell navGroups={navGroups} role={role}>
      {showDesktopBanner ? <DesktopOnlyBanner /> : null}
      {showGuardedSpinner ? <GuardedSpinner permsReady={false} /> : null}
      {!showGuardedSpinner && denied ? <PermissionDenied /> : null}
      {!showGuardedSpinner && !denied ? <Outlet /> : null}
    </AppShell>
  );
}

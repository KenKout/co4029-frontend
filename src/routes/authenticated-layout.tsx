import { useEffect } from "react";
import { useLocation, useNavigate, Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { DesktopOnlyBanner } from "@/components/ui/desktop-only-banner";
import { useMyPermissions } from "@/lib/api/hooks/auth";
import {
  adminNavGroups,
  studentNavGroups,
  teacherNavGroups,
} from "@/lib/navigation";

const DESKTOP_FIRST_PREFIXES = ["/admin", "/teacher", "/dept", "/management"];

// URL prefixes that require elevated permissions.
const ADMIN_PREFIXES = ["/admin"];
const TEACHER_PREFIXES = ["/teacher", "/dept", "/management"];

// Permission codes that grant access. Mirror SectionSwitcher.tsx so the
// header switcher and the route guard agree on who can reach what.
const ADMIN_PERMS = ["system.administer"];
const TEACHER_PERMS = ["course.create", "lesson.manage"];

function hasAny(
  perms: readonly string[],
  required: readonly string[],
): boolean {
  return required.some((p) => perms.includes(p));
}

export default function AuthenticatedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useMyPermissions();
  const perms = permissions.data?.permissions ?? [];

  const onAdminPath = ADMIN_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );
  const onTeacherPath = TEACHER_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );
  const needsCheck = onAdminPath || onTeacherPath;

  // Wait for the permission query to settle before deciding access. While
  // loading we treat privileged paths as blocked to avoid flashing the admin
  // sidebar to a student who happens to be in the middle of a check.
  const permsReady = !permissions.isLoading;
  const isAllowed =
    !needsCheck ||
    (permsReady &&
      ((onAdminPath && hasAny(perms, ADMIN_PERMS)) ||
        (onTeacherPath && hasAny(perms, TEACHER_PERMS))));

  useEffect(() => {
    if (!needsCheck) return;
    if (!permsReady) return;
    if (isAllowed) return;

    toast.error("Bạn không có quyền truy cập trang này.");
    void navigate({ to: "/dashboard", replace: true });
  }, [needsCheck, permsReady, isAllowed, navigate]);

  // Pick nav items based on permission, not just URL — a student who
  // somehow lands on /admin/* should see the student sidebar while the
  // redirect is in flight.
  const navGroups =
    isAllowed && onAdminPath
      ? adminNavGroups
      : isAllowed && onTeacherPath
        ? teacherNavGroups
        : studentNavGroups;

  const role =
    isAllowed && onAdminPath
      ? ("admin" as const)
      : isAllowed && onTeacherPath
        ? ("teacher" as const)
        : ("student" as const);

  const showDesktopBanner = DESKTOP_FIRST_PREFIXES.some((p) =>
    location.pathname.startsWith(p),
  );

  const showGuardedSpinner = needsCheck && !isAllowed;

  return (
    <AppShell navGroups={navGroups} role={role}>
      {showDesktopBanner ? <DesktopOnlyBanner /> : null}
      {showGuardedSpinner ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 text-sm font-semibold text-m3-on-surface shadow-editorial border border-border">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>
              {permsReady
                ? "Đang chuyển hướng..."
                : "Đang kiểm tra quyền truy cập..."}
            </span>
          </div>
        </div>
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}

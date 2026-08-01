import { Loader2 } from "lucide-react";

/**
 * Placeholder shown in place of `<Outlet />` while a privileged route is still
 * being checked, or while the redirect away from it is in flight.
 */
export default function GuardedSpinner({
  permsReady,
}: {
  permsReady: boolean;
}) {
  return (
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
  );
}

import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Placeholder shown in place of `<Outlet />` while a privileged route is still
 * being checked, or while the redirect away from it is in flight.
 */
export default function GuardedSpinner({
  permsReady,
}: {
  permsReady: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 text-sm font-semibold text-m3-on-surface shadow-editorial border border-border">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>
          {permsReady
            ? t("auth.redirecting")
            : t("auth.checking_access")}
        </span>
      </div>
    </div>
  );
}

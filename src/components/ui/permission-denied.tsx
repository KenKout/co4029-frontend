import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-page "you can't be here" state, shown IN PLACE of the denied route.
 *
 * Replaces the old toast + redirect dance: a permission-violation URL now
 * renders this page at the same address (no route jumping, no auto-bounce to
 * /dashboard), so the URL stays honest and the user decides where to go next.
 *
 * The Back button returns to the previous history entry when one exists
 * (normal navigation), otherwise falls back to /dashboard (deep link /
 * fresh tab).
 */
export function PermissionDenied() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      void navigate({ to: "/dashboard" });
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <p className="font-headline font-black text-7xl leading-none text-m3-outline/30 select-none">
          404
        </p>
        <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-m3-error-container">
          <ShieldX className="h-7 w-7 text-m3-on-error-container" />
        </div>
        <h1 className="mt-5 text-xl font-headline font-bold text-m3-on-surface">
          {t("permission_denied.title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-m3-on-surface-variant">
          {t("permission_denied.description")}
        </p>
        <Button onClick={goBack} className="mt-7 gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("permission_denied.back")}
        </Button>
      </div>
    </div>
  );
}

export default PermissionDenied;

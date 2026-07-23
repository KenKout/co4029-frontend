import { useRouter } from "@tanstack/react-router";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/**
 * Router-level error fallback. Without this, an uncaught render error in any
 * route component blanks the entire app to a white screen (React unmounts the
 * whole tree). This catches the throw, shows a readable message + recovery
 * actions, and surfaces the actual error text so the underlying bug is
 * diagnosable instead of invisible.
 */
export function RouteErrorBoundary({ error }: { error: unknown }) {
  const { t } = useTranslation();
  const router = useRouter();
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <div className="space-y-1">
        <p className="font-headline text-lg font-bold text-m3-on-surface">
          {t("common.error_boundary.title", {
            defaultValue: "Something went wrong on this page",
          })}
        </p>
        <p className="mx-auto max-w-md text-sm text-m3-on-surface-variant">
          {t("common.error_boundary.body", {
            defaultValue:
              "The page hit an unexpected error. You can try reloading it.",
          })}
        </p>
      </div>
      {/* The actual error message — kept visible so the real cause is never
          hidden behind a generic screen. */}
      <pre className="max-w-lg overflow-auto rounded-lg bg-m3-surface-container-low px-3 py-2 text-left text-xs text-m3-on-surface-variant">
        {message}
      </pre>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => void router.invalidate()}
        >
          <RotateCw className="h-4 w-4" />
          {t("common.error_boundary.retry", { defaultValue: "Try again" })}
        </Button>
        <Button className="gap-2" onClick={() => window.location.reload()}>
          {t("common.error_boundary.reload", { defaultValue: "Reload page" })}
        </Button>
      </div>
    </div>
  );
}

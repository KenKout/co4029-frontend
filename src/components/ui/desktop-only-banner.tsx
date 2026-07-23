import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";

const MIN_DESKTOP_WIDTH = 1024;

export function DesktopOnlyBanner() {
  const { t } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const evaluate = () => setShowBanner(window.innerWidth < MIN_DESKTOP_WIDTH);
    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, []);

  if (!showBanner || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="desktop-only-banner"
      className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text-strong"
    >
      <Monitor
        className="mt-0.5 size-5 shrink-0 text-warning"
        aria-hidden="true"
      />
      <div className="flex-1">
        <p className="font-medium">{t("desktop_only.title")}</p>
        <p className="text-text-muted">{t("desktop_only.description")}</p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-text-muted hover:bg-surface-muted hover:text-text-strong"
      >
        {t("desktop_only.dismiss")}
      </button>
    </div>
  );
}

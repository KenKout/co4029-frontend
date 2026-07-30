import { AlertTriangle, Info, WifiOff, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ErrorBannerSeverity = "error" | "warning" | "info";

export interface ErrorBannerAction {
  label: string;
  onClick: () => void;
  /** Primary action renders filled; others render outlined. */
  primary?: boolean;
}

/**
 * A reusable, accessible recovery banner for interview error/degraded states
 * (spec §10): connection lost, reconnecting, mic denied/disconnected, no audio
 * detected, transcription failure, submission failure, session timeout, ended
 * unexpectedly.
 *
 * Every instance is expected to answer three questions for the candidate:
 * what happened (`title`), whether their progress is safe (`reassurance`), and
 * what to do next (`actions`). State is never conveyed by color alone — each
 * severity carries a distinct icon and the region is announced via aria-live.
 */
export function ErrorBanner({
  severity = "error",
  title,
  description,
  reassurance,
  actions = [],
  icon,
  onDismiss,
  className,
}: {
  severity?: ErrorBannerSeverity;
  title: string;
  description?: ReactNode;
  /** Short, calming note on whether progress is preserved. */
  reassurance?: ReactNode;
  actions?: ErrorBannerAction[];
  /** Override the default severity icon (e.g. a WifiOff for connection loss). */
  icon?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();

  const palette =
    severity === "error"
      ? "border-danger/30 bg-danger-soft/60"
      : severity === "warning"
        ? "border-warning/30 bg-accent-soft/50"
        : "border-primary/25 bg-primary-soft/50";

  const iconTone =
    severity === "error"
      ? "text-danger"
      : severity === "warning"
        ? "text-warning"
        : "text-primary";

  const defaultIcon =
    severity === "info" ? (
      <Info className="h-5 w-5" />
    ) : severity === "warning" ? (
      <AlertTriangle className="h-5 w-5" />
    ) : (
      <AlertTriangle className="h-5 w-5" />
    );

  return (
    <div
      // assertive for errors (needs immediate attention), polite otherwise.
      role={severity === "error" ? "alert" : "status"}
      aria-live={severity === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-editorial sm:px-5",
        // A banner is inserted into normal flow, so without an entrance it
        // shoves everything below it down in a single frame — during an
        // interview that reads as the page breaking rather than as a warning
        // arriving. Deliberately quick: this is an interruption, not decoration.
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-safe:ease-out",
        palette,
        className,
      )}
    >
      <span className={cn("mt-0.5 shrink-0", iconTone)} aria-hidden="true">
        {icon ?? defaultIcon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-strong">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm text-text-body">{description}</p>
        )}
        {reassurance && (
          <p className="mt-1 text-xs font-medium text-text-muted">
            {reassurance}
          </p>
        )}

        {actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                size="lg"
                variant={action.primary ? "default" : "outline"}
                onClick={action.onClick}
                className="min-h-11 rounded-lg"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t("common.dismiss")}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-text-muted outline-none transition-colors hover:bg-white/60 hover:text-text-strong focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Convenience preset for the most common interview error: lost connection. */
export function ConnectionLostBanner({
  reconnecting = false,
  onRetry,
}: {
  reconnecting?: boolean;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ErrorBanner
      severity={reconnecting ? "warning" : "error"}
      icon={<WifiOff className="h-5 w-5" />}
      title={
        reconnecting
          ? t("course_interview.recovery.reconnecting_title")
          : t("course_interview.recovery.connection_lost_title")
      }
      description={
        reconnecting
          ? t("course_interview.recovery.reconnecting_body")
          : t("course_interview.recovery.connection_lost_body")
      }
      reassurance={t("course_interview.recovery.progress_safe")}
      actions={
        !reconnecting && onRetry
          ? [
              {
                label: t("course_interview.recovery.reconnect"),
                onClick: onRetry,
                primary: true,
              },
            ]
          : []
      }
    />
  );
}

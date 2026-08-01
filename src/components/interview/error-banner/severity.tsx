/**
 * Severity presentation for `<ErrorBanner>`: the container palette, the icon
 * tone, and the default glyph.
 *
 * Split out of `error-banner.tsx` so the banner component itself stays a flat
 * layout with one decision per region — the three nested severity ternaries
 * were the bulk of its branch count.
 */

import { AlertTriangle, Info } from "lucide-react";

export type ErrorBannerSeverity = "error" | "warning" | "info";

/** Container border + background classes for a severity. */
export function severityPalette(severity: ErrorBannerSeverity): string {
  return severity === "error"
    ? "border-danger/30 bg-danger-soft/60"
    : severity === "warning"
      ? "border-warning/30 bg-accent-soft/50"
      : "border-primary/25 bg-primary-soft/50";
}

/** Icon color token for a severity. */
export function severityIconTone(severity: ErrorBannerSeverity): string {
  return severity === "error"
    ? "text-danger"
    : severity === "warning"
      ? "text-warning"
      : "text-primary";
}

/** Default glyph rendered when the caller passes no `icon` override. */
export function SeverityIcon({ severity }: { severity: ErrorBannerSeverity }) {
  return severity === "info" ? (
    <Info className="h-5 w-5" />
  ) : severity === "warning" ? (
    <AlertTriangle className="h-5 w-5" />
  ) : (
    <AlertTriangle className="h-5 w-5" />
  );
}

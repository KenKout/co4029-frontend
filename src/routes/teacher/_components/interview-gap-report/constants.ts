import { Eye, Maximize, MonitorX } from "lucide-react";

/**
 * Constant display tables for the teacher gap-report screen, extracted from the
 * former 1.7k-line interview-gap-report.tsx. Shared by the integrity timeline
 * (severity + event styling) and the transcript pager.
 */

export const TRANSCRIPT_PAGE_SIZE = 8;

/* ── Integrity severity → colour (mirrors the quiz attempt-detail panel) ── */
export const INTEGRITY_SEVERITY_META: Record<
  string,
  { badge: string; dot: string }
> = {
  critical: { badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
  warning: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  info: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
};

/* ── Integrity event type → icon + accent colour ──────────────────────────
 * Each proctoring signal gets its own icon and colour so the timeline reads at
 * a glance instead of a wall of identical amber rows. Colour follows the
 * event's inherent severity (tab switch / fullscreen exit = warning amber,
 * focus loss = informational blue). */
export const INTEGRITY_EVENT_META: Record<
  string,
  { icon: typeof MonitorX; tint: string; iconBg: string }
> = {
  tab_switch: {
    icon: MonitorX,
    tint: "text-amber-600",
    iconBg: "bg-amber-50 text-amber-600",
  },
  focus_lost: {
    icon: Eye,
    tint: "text-blue-600",
    iconBg: "bg-blue-50 text-blue-600",
  },
  fullscreen_exit: {
    icon: Maximize,
    tint: "text-amber-600",
    iconBg: "bg-amber-50 text-amber-600",
  },
};

import { Brain, CheckCircle2, Lock } from "lucide-react";
import type { LessonOverviewItem } from "@/lib/api/types";

/**
 * Per-status presentation for a lesson row.
 *
 * `iconBg` / `iconFg` replace the two `mature ? … : learning ? … : …` ternary
 * chains the row used inline — same class strings, keyed by the same status.
 */
export const STATUS_META: Record<
  LessonOverviewItem["status"],
  {
    i18nKey: string;
    badge: string;
    dot: string;
    icon: typeof CheckCircle2;
    iconBg: string;
    iconFg: string;
  }
> = {
  mature: {
    i18nKey: "sr_dashboard.status.mature",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
    iconBg: "bg-emerald-100",
    iconFg: "text-emerald-600",
  },
  learning: {
    i18nKey: "sr_dashboard.status.learning",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
    icon: Brain,
    iconBg: "bg-amber-100",
    iconFg: "text-amber-600",
  },
  locked: {
    i18nKey: "sr_dashboard.status.locked",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
    icon: Lock,
    iconBg: "bg-slate-100",
    iconFg: "text-slate-500",
  },
};

import { Clock, FileStack, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { TeacherDashboardStats } from "@/lib/api/hooks/teacher-courses";
import { cn } from "@/lib/utils";

import { formatCount } from "../helpers";
import type { TranslateFn } from "../types";

/**
 * Context numbers, in the rail.
 *
 * Deliberately kept to facts that do NOT repeat the work queue: the queue
 * already states everything that needs acting on, so restating those
 * counts would double the page without adding information. What remains is
 * signal the queue does not carry:
 *
 *   - students below the retention threshold (spaced-repetition easiness
 *     below the 2.0 struggling threshold — nowhere else on the page),
 *   - reviews past due (student review cards behind schedule — context,
 *     not an action: the teacher cannot clear them, so they do not belong
 *     in the queue),
 *   - draft courses (invisible to students until published — the queue
 *     covers content awaiting review, not content awaiting publication).
 *
 * Rendered as compact rows rather than the former full-width StatCards.
 * Three cards spanning the page gave the largest visual weight on the
 * dashboard to its least actionable numbers, and on an empty dashboard
 * they were the only thing left with any ink in it.
 */
export function AtAGlance({
  stats,
  t,
}: {
  stats: TeacherDashboardStats | undefined;
  t: TranslateFn;
}) {
  return (
    <section className="rounded-xl bg-card shadow-editorial ghost-border">
      <h2 className="border-b border-m3-outline-variant/20 px-4 py-3 text-xs font-bold tracking-widest text-m3-on-surface-variant uppercase">
        {t("teacher_dashboard.rail.at_a_glance")}
      </h2>
      <dl className="divide-y divide-m3-outline-variant/20">
        <Stat
          icon={TrendingDown}
          label={t("teacher_dashboard.signals.below_retention_threshold")}
          hint={t("teacher_dashboard.signals.below_retention_threshold_sub")}
          value={formatCount(stats?.students_below_ef_threshold)}
          alert={(stats?.students_below_ef_threshold ?? 0) > 0}
        />
        <Stat
          icon={Clock}
          label={t("teacher_dashboard.signals.reviews_overdue")}
          hint={t("teacher_dashboard.signals.reviews_overdue_sub")}
          value={formatCount(stats?.cards_overdue)}
          alert={(stats?.cards_overdue ?? 0) > 0}
        />
        <Stat
          icon={FileStack}
          label={t("teacher_dashboard.signals.draft_courses")}
          hint={t("teacher_dashboard.signals.draft_courses_sub")}
          value={formatCount(stats?.draft_courses)}
        />
      </dl>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  hint,
  value,
  alert = false,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon
        aria-hidden="true"
        className={cn(
          "h-4 w-4 shrink-0",
          alert ? "text-destructive" : "text-m3-on-surface-variant",
        )}
      />
      <div className="min-w-0 flex-1">
        <dt className="truncate text-sm font-medium text-text-strong">
          {label}
        </dt>
        {/* The hint explains what the number measures. It is the whole
            reason these are not bare digits — "0" against "Reviews past
            due" is only meaningful once you know it counts student cards
            rather than the teacher's own queue. */}
        <dd className="truncate text-xs text-text-muted">{hint}</dd>
      </div>
      <dd
        className={cn(
          "shrink-0 text-lg font-bold tabular-nums",
          alert ? "text-destructive" : "text-text-strong",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

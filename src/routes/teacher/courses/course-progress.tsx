import { useMemo } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAtRiskRoster, useCohortProgress } from "@/lib/api/hooks/progress";
import {
  useTeacherCourseById,
  useTeacherCourseRoster,
} from "@/lib/api/hooks/teacher-courses";
import { SectionHeader } from "@/components/ui/section-header";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { cn } from "@/lib/utils";

function formatHours(seconds: number) {
  if (seconds <= 0) return "0h";
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.max(1, Math.round(seconds / 60))}m`;
  return `${hours.toFixed(1)}h`;
}

function relDays(days: number | null) {
  if (days === null) return null;
  if (days < 1) return "today";
  if (days < 2) return "1d";
  return `${Math.round(days)}d`;
}

export default function TeacherCourseProgressPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };

  useTeacherCourseById(courseId);
  const { data: roster, isLoading: rosterLoading } =
    useTeacherCourseRoster(courseId);
  const { data: cohort, isLoading: cohortLoading } =
    useCohortProgress(courseId);
  const { data: atRisk, isLoading: atRiskLoading } = useAtRiskRoster(courseId);

  // Roster gives us display_name + email; cohort gives per-lesson counts.
  const studentNames = useMemo(() => {
    const map = new Map<string, { name: string; email: string }>();
    for (const s of roster?.students ?? []) {
      map.set(s.student_id, {
        name: s.display_name,
        email: s.primary_email,
      });
    }
    return map;
  }, [roster]);

  const rows = useMemo(() => {
    return (cohort?.students ?? []).map((row) => {
      const meta = studentNames.get(row.user_id);
      return {
        ...row,
        completion_percent: Number(row.completion_percent),
        display_name: meta?.name ?? row.user_id.slice(0, 8),
        email: meta?.email ?? "",
      };
    });
  }, [cohort, studentNames]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.completion_percent - a.completion_percent),
    [rows],
  );

  const summary = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((r) => r.completion_percent >= 100).length;
    const inProgress = rows.filter(
      (r) =>
        r.in_progress_lessons > 0 ||
        (r.completed_lessons > 0 && r.completion_percent < 100),
    ).length;
    const notStarted = rows.filter(
      (r) => r.completed_lessons === 0 && r.in_progress_lessons === 0,
    ).length;
    const avgCompletion = total
      ? rows.reduce((acc, r) => acc + r.completion_percent, 0) / total
      : 0;
    const totalHours = rows.reduce((acc, r) => acc + r.total_time_seconds, 0);
    return {
      total,
      completed,
      inProgress,
      notStarted,
      avgCompletion,
      totalHours,
    };
  }, [rows]);

  const atRiskById = useMemo(() => {
    const map = new Map<string, { reason: string; days: number | null }>();
    for (const s of atRisk?.students ?? []) {
      const reason =
        s.reasons?.[0]?.detail ??
        s.reasons?.[0]?.code ??
        t("teacher_progress.no_reason");
      map.set(s.user_id, {
        reason,
        days: s.days_since_last_engagement,
      });
    }
    return map;
  }, [atRisk, t]);

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="pt-2">
          <SectionHeader
            title={t("teacher_progress.title")}
            subtitle={t("teacher_progress.subtitle")}
          />
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile
            icon={Users}
            label={t("teacher_progress.tiles.enrolled")}
            value={summary.total}
            loading={cohortLoading}
          />
          <SummaryTile
            icon={CheckCircle2}
            label={t("teacher_progress.tiles.completed")}
            value={summary.completed}
            loading={cohortLoading}
            tone="emerald"
          />
          <SummaryTile
            icon={TrendingUp}
            label={t("teacher_progress.tiles.avg_completion")}
            value={`${summary.avgCompletion.toFixed(0)}%`}
            loading={cohortLoading}
          />
          <SummaryTile
            icon={Clock}
            label={t("teacher_progress.tiles.total_time")}
            value={formatHours(summary.totalHours)}
            loading={cohortLoading}
          />
        </div>

        {/* At-risk panel */}
        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-m3-outline-variant/20">
            <div>
              <h2 className="font-headline font-bold text-base text-m3-on-surface flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                {t("teacher_progress.at_risk_title")}
              </h2>
              <p className="text-xs text-m3-on-surface-variant mt-0.5">
                {t("teacher_progress.at_risk_subtitle")}
              </p>
            </div>
            <span
              className={cn(
                "text-xs font-bold px-3 py-1 rounded-full",
                (atRisk?.students.length ?? 0) > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-50 text-emerald-700",
              )}
            >
              {atRiskLoading
                ? "…"
                : t("teacher_progress.at_risk_count", {
                    count: atRisk?.students.length ?? 0,
                  })}
            </span>
          </div>

          {atRiskLoading ? (
            <div className="p-5 space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-m3-surface-container-low animate-pulse"
                />
              ))}
            </div>
          ) : !atRisk?.students.length ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-m3-on-surface">
                {t("teacher_progress.at_risk_empty_title")}
              </p>
              <p className="text-xs text-m3-on-surface-variant mt-1">
                {t("teacher_progress.at_risk_empty_body")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-m3-outline-variant/10">
              {atRisk.students.map((s) => {
                const meta = studentNames.get(s.user_id);
                const days = relDays(s.days_since_last_engagement);
                return (
                  <Link
                    key={s.user_id}
                    to="/teacher/courses/$courseId/students/$studentId"
                    params={{ courseId, studentId: s.user_id }}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-6 py-3 hover:bg-m3-surface-container-low transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-m3-on-surface truncate">
                        {meta?.name ?? s.user_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-m3-on-surface-variant truncate">
                        {s.reasons?.[0]?.detail ??
                          s.reasons?.[0]?.code ??
                          t("teacher_progress.no_reason")}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                      {Number(s.completion_percent).toFixed(0)}%
                    </span>
                    {days && (
                      <span className="text-xs text-m3-on-surface-variant inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {days}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Roster table */}
        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
          <div className="px-6 py-4 border-b border-m3-outline-variant/20">
            <h2 className="font-headline font-bold text-base text-m3-on-surface flex items-center gap-2">
              <Activity className="h-4 w-4 text-m3-secondary" />
              {t("teacher_progress.roster_title")}
            </h2>
            <p className="text-xs text-m3-on-surface-variant mt-0.5">
              {t("teacher_progress.roster_subtitle")}
            </p>
          </div>

          <div className="hidden sm:grid grid-cols-[1fr_120px_140px_120px_100px] gap-4 px-6 py-2.5 bg-m3-surface-container-low">
            <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_progress.cols.student")}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_progress.cols.lessons")}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_progress.cols.progress")}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_progress.cols.time")}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant text-right">
              {t("teacher_progress.cols.status")}
            </span>
          </div>

          {rosterLoading || cohortLoading ? (
            <div className="p-6 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-m3-surface-container-low animate-pulse"
                />
              ))}
            </div>
          ) : !sortedRows.length ? (
            <div className="px-6 py-12 text-center">
              <Users className="h-8 w-8 text-m3-on-surface-variant opacity-40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-m3-on-surface">
                {t("teacher_progress.empty_roster_title")}
              </p>
              <p className="text-xs text-m3-on-surface-variant mt-1">
                {t("teacher_progress.empty_roster_body")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-m3-outline-variant/10">
              {sortedRows.map((row) => {
                const isAtRisk = atRiskById.has(row.user_id);
                const isComplete = row.completion_percent >= 100;
                const isStarted =
                  row.completed_lessons > 0 || row.in_progress_lessons > 0;
                return (
                  <Link
                    key={row.user_id}
                    to="/teacher/courses/$courseId/students/$studentId"
                    params={{ courseId, studentId: row.user_id }}
                    className="grid grid-cols-[1fr_120px_140px_120px_100px] gap-4 items-center px-6 py-3 hover:bg-m3-surface-container-low transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-m3-on-surface truncate">
                        {row.display_name}
                      </p>
                      {row.email && (
                        <p className="text-xs text-m3-on-surface-variant truncate">
                          {row.email}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-m3-on-surface-variant tabular-nums">
                      {row.completed_lessons}/{row.total_lessons}
                    </span>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[10px] font-bold tabular-nums text-m3-on-surface-variant">
                        {row.completion_percent.toFixed(0)}%
                      </span>
                      <GradientProgress
                        value={row.completion_percent}
                        size="sm"
                        variant="primary"
                      />
                    </div>
                    <span className="text-xs text-m3-on-surface-variant inline-flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {formatHours(row.total_time_seconds)}
                    </span>
                    <div className="flex justify-end">
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("teacher_progress.status.completed")}
                        </span>
                      ) : isAtRisk ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                          <AlertTriangle className="h-3 w-3" />
                          {t("teacher_progress.status.at_risk")}
                        </span>
                      ) : isStarted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-m3-primary bg-m3-primary-fixed px-2 py-1 rounded-full">
                          <PlayCircle className="h-3 w-3" />
                          {t("teacher_progress.status.in_progress")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-m3-on-surface-variant bg-m3-surface-container px-2 py-1 rounded-full">
                          {t("teacher_progress.status.not_started")}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  loading?: boolean;
  tone?: "emerald" | "default";
}) {
  return (
    <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4 flex items-start gap-3">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          tone === "emerald" ? "bg-emerald-50" : "bg-m3-primary-fixed",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            tone === "emerald" ? "text-emerald-600" : "text-m3-primary",
          )}
        />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant truncate">
          {label}
        </p>
        <p className="text-2xl font-headline font-black text-m3-primary mt-0.5 tabular-nums">
          {loading ? "—" : value}
        </p>
      </div>
    </div>
  );
}

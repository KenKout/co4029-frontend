import { useState, useMemo } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Search,
  Filter,
  Users,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Clock,
  UserCheck,
  UserX,
  UserMinus,
  ArrowUpRight,
  Award,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useTeacherCourseById,
  useTeacherCourseRoster,
} from "@/lib/api/hooks/teacher-courses";
import type { RosterStudent } from "@/lib/api/types/teacher";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/* ── Risk / status helpers ── */
const RISK_META: Record<string, { label: string; badge: string; dot: string }> =
  {
    none: {
      label: "On Track",
      badge: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
    },
    low: {
      label: "Low Risk",
      badge: "bg-blue-100 text-blue-700",
      dot: "bg-blue-400",
    },
    medium: {
      label: "At Risk",
      badge: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
    },
    high: {
      label: "High Risk",
      badge: "bg-red-100 text-red-700",
      dot: "bg-red-500",
    },
  };

const ENROLL_META: Record<string, { label: string; badge: string }> = {
  active: { label: "Active", badge: "bg-emerald-100 text-emerald-700" },
  completed: {
    label: "Completed",
    badge: "bg-m3-primary-fixed text-m3-primary",
  },
  dropped: { label: "Dropped", badge: "bg-slate-100 text-slate-500" },
  waitlisted: { label: "Waitlist", badge: "bg-amber-100 text-amber-700" },
};

type StatusFilter = "all" | "active" | "completed" | "dropped" | "at_risk";
type SortKey = "progress" | "name" | "enrolled_at" | "risk";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "at_risk", label: "At Risk" },
  { key: "completed", label: "Completed" },
  { key: "dropped", label: "Dropped" },
];

/* ── Avatar initials + colour ── */
function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

const AVATAR_COLORS = [
  "bg-m3-primary-fixed text-m3-primary",
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-sky-100 text-sky-700",
];

function avatarColor(studentId: string) {
  let hash = 0;
  for (let i = 0; i < studentId.length; i++)
    hash = studentId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function relDate(iso: string | null) {
  if (!iso) return "Never";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/* ════════════════════════════════════════ */
export default function CourseStudentsPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  useTeacherCourseById(courseId);
  const { data: roster, isLoading } = useTeacherCourseRoster(courseId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("progress");

  const students = roster?.students ?? [];

  /* ── Cohort stats ── */
  const activeCount = students.filter(
    (s) => s.enrollment_status === "active",
  ).length;
  const completedCount = students.filter(
    (s) => s.enrollment_status === "completed",
  ).length;
  const atRiskCount = students.filter(
    (s) => s.at_risk_level === "medium" || s.at_risk_level === "high",
  ).length;
  const avgProgress = students.length
    ? Math.round(
        students.reduce((a, s) => a + s.progress_percent, 0) / students.length,
      )
    : 0;

  /* ── Filter + sort ── */
  const filtered = useMemo<RosterStudent[]>(() => {
    let list = students;

    if (statusFilter === "at_risk") {
      list = list.filter(
        (s) => s.at_risk_level === "medium" || s.at_risk_level === "high",
      );
    } else if (statusFilter !== "all") {
      list = list.filter((s) => s.enrollment_status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.display_name.toLowerCase().includes(q) ||
          s.primary_email.toLowerCase().includes(q),
      );
    }

    return [...list].sort((a, b) => {
      if (sortKey === "name")
        return a.display_name.localeCompare(b.display_name);
      if (sortKey === "progress")
        return b.progress_percent - a.progress_percent;
      if (sortKey === "enrolled_at")
        return b.enrolled_at.localeCompare(a.enrolled_at);
      if (sortKey === "risk") {
        const order = { high: 3, medium: 2, low: 1, none: 0 };
        return (
          (order[b.at_risk_level as keyof typeof order] ?? 0) -
          (order[a.at_risk_level as keyof typeof order] ?? 0)
        );
      }
      return 0;
    });
  }, [students, statusFilter, search, sortKey]);

  const riskBreakdown = (["high", "medium", "low", "none"] as const).map(
    (level) => ({
      level,
      meta: RISK_META[level],
      count: students.filter((s) => s.at_risk_level === level).length,
      pct: students.length
        ? Math.round(
            (students.filter((s) => s.at_risk_level === level).length /
              students.length) *
              100,
          )
        : 0,
    }),
  );

  return (
    <div className="max-w-[1440px] mx-auto pb-16">
      {/* ── Header ── (course title + tabs live in the shell above) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 pt-2">
        <div className="space-y-1">
          <span className="text-m3-secondary font-headline font-bold text-xs tracking-widest uppercase">
            Student Management
          </span>
          <h1 className="font-headline font-extrabold text-3xl lg:text-4xl text-m3-primary tracking-tight leading-tight">
            {t("teacher_common.nav_students")}
          </h1>
          <p className="text-m3-on-surface-variant text-sm">
            {students.length} enrolled &bull; {activeCount} active &bull;{" "}
            {completedCount} completed
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {atRiskCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-2.5 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" />
              {atRiskCount} student{atRiskCount !== 1 ? "s" : ""} need attention
            </div>
          )}
        </div>
      </div>

      {/* ── 12-col grid ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* ── Main 8 cols ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total",
                value: String(students.length),
                sub: "Enrolled",
                icon: Users,
                cls: "",
              },
              {
                label: "Avg Progress",
                value: `${avgProgress}%`,
                sub: "Cohort avg",
                icon: TrendingUp,
                cls: "",
              },
              {
                label: "At Risk",
                value: String(atRiskCount),
                sub: "Need attention",
                icon: AlertTriangle,
                cls: atRiskCount > 0 ? "border-amber-200" : "",
              },
              {
                label: "Completed",
                value: String(completedCount),
                sub: "Finished",
                icon: Award,
                cls: "",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={cn(
                  "bg-m3-surface-container-lowest rounded-xl p-4 ghost-border shadow-editorial space-y-2",
                  s.cls,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-m3-on-surface-variant">
                    {s.label}
                  </span>
                  <s.icon className="h-4 w-4 text-m3-secondary" />
                </div>
                <div className="text-2xl font-headline font-black text-m3-primary">
                  {s.value}
                </div>
                <div className="text-xs text-m3-on-surface-variant">
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Search + Filter bar */}
          <div className="bg-m3-surface-container-lowest rounded-xl p-5 ghost-border shadow-editorial space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/60" />
              <input
                type="text"
                placeholder={t("teacher_common.search_students")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/20 text-sm text-m3-on-surface placeholder:text-m3-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-m3-primary/20 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Status segmented control — shared component, per-status counts. */}
              <SegmentedFilter
                ariaLabel="Student status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_FILTERS.map((f) => ({
                  key: f.key,
                  label: f.label,
                  count:
                    f.key === "all"
                      ? students.length
                      : f.key === "at_risk"
                        ? atRiskCount
                        : students.filter((s) => s.enrollment_status === f.key)
                            .length,
                }))}
              />

              <div className="flex items-center gap-2 text-xs text-m3-on-surface-variant">
                <Filter className="h-3.5 w-3.5" />
                <span>Sort:</span>
                <Select<SortKey>
                  value={sortKey}
                  onValueChange={(next) => setSortKey(next)}
                  size="sm"
                  className="w-44"
                  options={[
                    { value: "progress", label: "Progress" },
                    { value: "name", label: "Name" },
                    { value: "enrolled_at", label: "Enrollment Date" },
                    { value: "risk", label: "Risk Level" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Student table */}
          <div className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial overflow-hidden">
            {/* Header */}
            <div className="hidden sm:grid grid-cols-[auto_1fr_130px_100px_90px_40px] gap-4 items-center px-5 py-3 border-b border-m3-outline-variant/10">
              <div className="w-10" />
              <span className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-wider">
                Student
              </span>
              <span className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-wider">
                Progress
              </span>
              <span className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-wider">
                Risk
              </span>
              <span className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-wider">
                Active
              </span>
              <div />
            </div>

            {isLoading ? (
              <div className="space-y-px">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="px-5 py-4 animate-pulse flex gap-4 items-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-m3-surface-container-high shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-m3-surface-container-high rounded w-1/3" />
                      <div className="h-2 bg-m3-surface-container-high rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              students.length === 0 ? (
                /* First-run — no enrollments exist yet. */
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center max-w-sm mx-auto">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-m3-primary-fixed">
                    <Users className="h-7 w-7 text-m3-primary" />
                  </div>
                  <p className="text-base font-headline font-bold text-m3-on-surface">
                    No students enrolled yet
                  </p>
                  <p className="text-sm text-m3-on-surface-variant">
                    Once students enroll in this course, they'll appear here
                    with their progress and risk signals.
                  </p>
                </div>
              ) : (
                /* No-match — enrollments exist but filters/search hid them. */
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-m3-on-surface-variant">
                  <Search className="h-10 w-10 opacity-30" />
                  <p className="text-sm font-medium text-m3-on-surface">
                    No students match
                  </p>
                  <p className="text-xs">
                    Try a different search term or clear your filters.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 gap-2"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("all");
                    }}
                  >
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                </div>
              )
            ) : (
              <div className="divide-y divide-m3-outline-variant/10">
                {filtered.map((student) => {
                  const risk =
                    RISK_META[student.at_risk_level] ?? RISK_META.none;
                  const enroll =
                    ENROLL_META[student.enrollment_status] ??
                    ENROLL_META.active;
                  const initials = avatarInitials(student.display_name);
                  const aColor = avatarColor(student.student_id);
                  return (
                    <Link
                      key={student.student_id}
                      to="/teacher/courses/$courseId/students/$studentId"
                      params={{ courseId, studentId: student.student_id }}
                      className="flex sm:grid sm:grid-cols-[auto_1fr_130px_100px_90px_40px] gap-4 items-center px-5 py-4 hover:bg-m3-surface-container-low transition-colors cursor-pointer group"
                    >
                      {/* Avatar — show the uploaded image when present,
                          otherwise the colour-coded initials fallback. */}
                      {student.avatar_url ? (
                        <img
                          src={student.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 uppercase",
                            aColor,
                          )}
                        >
                          {initials || "?"}
                        </div>
                      )}

                      {/* Name + email + enrollment status */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-m3-on-surface truncate">
                            {student.display_name}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                              enroll.badge,
                            )}
                          >
                            {enroll.label}
                          </span>
                        </div>
                        <p className="text-xs text-m3-on-surface-variant truncate mt-0.5">
                          {student.primary_email}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="hidden sm:flex flex-col gap-1 min-w-0">
                        <div className="flex justify-between text-[10px] font-medium text-m3-on-surface-variant">
                          <span>{Math.round(student.progress_percent)}%</span>
                        </div>
                        <GradientProgress
                          value={student.progress_percent}
                          size="sm"
                          variant="primary"
                        />
                      </div>

                      {/* Risk badge */}
                      <div className="hidden sm:flex items-center">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-full",
                            risk.badge,
                          )}
                        >
                          {risk.label}
                        </span>
                      </div>

                      {/* Last active */}
                      <div className="hidden sm:flex items-center gap-1 text-xs text-m3-on-surface-variant">
                        <Clock className="h-3 w-3" />
                        {relDate(student.last_activity_at)}
                      </div>

                      {/* Arrow */}
                      <div className="hidden sm:flex items-center justify-end">
                        <ChevronRight className="h-4 w-4 text-m3-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar 4 cols ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
          {/* Cohort overview */}
          <div className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-5">
            <h3 className="font-headline font-bold text-m3-primary text-base">
              Cohort Overview
            </h3>

            {riskBreakdown.map(({ level, meta, count, pct }) => (
              <div key={level} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)}
                    />
                    <span className="font-medium text-m3-on-surface">
                      {meta.label}
                    </span>
                  </div>
                  <span className="font-bold text-m3-on-surface-variant">
                    {count}{" "}
                    <span className="font-normal opacity-60">({pct}%)</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-m3-surface-container-high overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      meta.dot,
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-m3-outline-variant/10">
              <div className="bg-m3-surface-container-low rounded-xl p-3 text-center">
                <div className="text-2xl font-headline font-black text-m3-primary">
                  {activeCount}
                </div>
                <div className="text-[10px] text-m3-on-surface-variant font-bold uppercase tracking-wide mt-0.5">
                  Active
                </div>
              </div>
              <div
                className={cn(
                  "rounded-xl p-3 text-center",
                  atRiskCount > 0
                    ? "bg-amber-50"
                    : "bg-m3-surface-container-low",
                )}
              >
                <div
                  className={cn(
                    "text-2xl font-headline font-black",
                    atRiskCount > 0 ? "text-amber-600" : "text-m3-primary",
                  )}
                >
                  {atRiskCount}
                </div>
                <div
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide mt-0.5",
                    atRiskCount > 0
                      ? "text-amber-600"
                      : "text-m3-on-surface-variant",
                  )}
                >
                  At Risk
                </div>
              </div>
            </div>
          </div>

          {/* Quick filters */}
          <div className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-2">
            <h3 className="font-headline font-bold text-m3-primary text-base mb-4">
              Quick Filters
            </h3>
            {[
              {
                icon: AlertTriangle,
                label: "At-Risk Students",
                color: "text-amber-600",
                bg: "bg-amber-50",
                filter: "at_risk" as StatusFilter,
              },
              {
                icon: UserCheck,
                label: "Active Students",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                filter: "active" as StatusFilter,
              },
              {
                icon: Award,
                label: "Completed Course",
                color: "text-m3-primary",
                bg: "bg-m3-primary-fixed",
                filter: "completed" as StatusFilter,
              },
              {
                icon: UserMinus,
                label: "Dropped Students",
                color: "text-slate-500",
                bg: "bg-slate-100",
                filter: "dropped" as StatusFilter,
              },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => setStatusFilter(a.filter)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-m3-surface-container-low transition-colors group text-left cursor-pointer"
              >
                <div className={cn("p-2 rounded-lg", a.bg)}>
                  <a.icon className={cn("h-4 w-4", a.color)} />
                </div>
                <span className="text-sm font-medium text-m3-on-surface flex-1">
                  {a.label}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-m3-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          {/* Top performer */}
          {students.length > 0 &&
            (() => {
              const top = [...students].sort(
                (a, b) => b.progress_percent - a.progress_percent,
              )[0];
              return (
                <Link
                  to="/teacher/courses/$courseId/students/$studentId"
                  params={{ courseId, studentId: top.student_id }}
                  className="gradient-primary rounded-xl p-6 text-white relative overflow-hidden shadow-lg block hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <UserX className="absolute -bottom-4 -right-4 h-24 w-24 text-white/10 pointer-events-none" />
                  <div className="relative z-10 space-y-3">
                    <h4 className="font-headline font-bold text-sm text-white/80 uppercase tracking-widest">
                      Top Performer
                    </h4>
                    <div className="flex items-center gap-3">
                      {top.avatar_url ? (
                        <img
                          src={top.avatar_url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold uppercase bg-white/20 text-white shrink-0">
                          {avatarInitials(top.display_name) || "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm">{top.display_name}</p>
                        <p className="text-xs text-white/70">
                          {Math.round(top.progress_percent)}% progress
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white transition-colors">
                      View profile <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })()}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  UserMinus,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GradientProgress } from "@/components/ui/gradient-progress";
import { Select } from "@/components/ui/select";
import {
  useTeacherCourseById,
  useTeacherCourseRoster,
} from "@/lib/api/hooks/teacher-courses";
import { useStudentQuizAttempts } from "@/lib/api/hooks/quizzes";
import { useStudentInterviewSessions } from "@/lib/api/hooks/interviews";
import {
  QuizAttemptsTable,
  InterviewSessionsTable,
} from "@/routes/teacher/_components/assessment-tables";
import { cn } from "@/lib/utils";

/* ── Helpers ── */
const RISK_META: Record<string, { label: string; badge: string; bar: string }> =
  {
    none: {
      label: "On Track",
      badge: "bg-emerald-100 text-emerald-700",
      bar: "bg-emerald-500",
    },
    low: {
      label: "Low Risk",
      badge: "bg-blue-100 text-blue-700",
      bar: "bg-blue-400",
    },
    medium: {
      label: "At Risk",
      badge: "bg-amber-100 text-amber-700",
      bar: "bg-amber-500",
    },
    high: {
      label: "High Risk",
      badge: "bg-red-100 text-red-700",
      bar: "bg-red-500",
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

const AVATAR_COLORS = [
  "bg-m3-primary-fixed text-m3-primary",
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-sky-100 text-sky-700",
];

function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

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
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ════════════════════════════════════════ */
export default function CourseStudentDetailPage() {
  const { t } = useTranslation();
  const { courseId, studentId } = useParams({ strict: false }) as {
    courseId: string;
    studentId: string;
  };

  const navigate = useNavigate();
  const { data: course } = useTeacherCourseById(courseId);
  const { data: roster, isLoading } = useTeacherCourseRoster(courseId);
  const { data: quizAttempts, isLoading: quizAttemptsLoading } =
    useStudentQuizAttempts(courseId, studentId);
  const { data: interviewSessions, isLoading: interviewSessionsLoading } =
    useStudentInterviewSessions(courseId, studentId);

  // ── Interview attempt filters (Interview / Result / Time) ──
  const [ivInterviewFilter, setIvInterviewFilter] = useState("all");
  const [ivResultFilter, setIvResultFilter] = useState("all");
  const [ivTimeFilter, setIvTimeFilter] = useState("all");

  const ivTimeCutoff = useMemo(() => {
    if (ivTimeFilter === "all") return null;
    const days = ivTimeFilter === "today" ? 1 : Number(ivTimeFilter);
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }, [ivTimeFilter]);

  // Distinct interview titles this student attempted, for the Interview dropdown.
  const ivInterviewTitles = useMemo(() => {
    const set = new Set<string>();
    for (const s of interviewSessions ?? []) set.add(s.interview_config_title);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [interviewSessions]);

  const filteredInterviewSessions = useMemo(() => {
    return (interviewSessions ?? []).filter((s) => {
      if (
        ivInterviewFilter !== "all" &&
        s.interview_config_title !== ivInterviewFilter
      )
        return false;
      if (ivResultFilter !== "all") {
        const r =
          s.status === "in_progress"
            ? "in_progress"
            : s.status === "failed"
              ? "failed"
              : s.status === "abandoned"
                ? "not_graded"
                : s.pass_verdict === true
                  ? "passed"
                  : s.pass_verdict === false
                    ? "not_passed"
                    : "evaluating";
        if (r !== ivResultFilter) return false;
      }
      if (ivTimeCutoff != null) {
        const ts = new Date(s.started_at).getTime();
        if (Number.isNaN(ts) || ts < ivTimeCutoff) return false;
      }
      return true;
    });
  }, [interviewSessions, ivInterviewFilter, ivResultFilter, ivTimeCutoff]);

  const ivFiltersActive =
    ivInterviewFilter !== "all" ||
    ivResultFilter !== "all" ||
    ivTimeFilter !== "all";

  const student = roster?.students.find((s) => s.student_id === studentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-headline font-bold text-m3-on-surface">
          Student not found
        </h2>
        <Link to="/teacher/courses/$courseId/students" params={{ courseId }}>
          <Button>Back to Students</Button>
        </Link>
      </div>
    );
  }

  const risk = RISK_META[student.at_risk_level] ?? RISK_META.none;
  const enroll = ENROLL_META[student.enrollment_status] ?? ENROLL_META.active;
  const aColor = avatarColor(student.student_id);
  const initials = avatarInitials(student.display_name);

  return (
    <div className="max-w-[1440px] mx-auto pb-16">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-xs text-m3-on-surface-variant pt-4 pb-6">
        <Link
          to="/teacher/courses"
          className="hover:text-m3-primary transition-colors"
        >
          {t("teacher_courses_list.title")}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <Link
          to="/teacher/courses/$courseId"
          params={{ courseId }}
          className="hover:text-m3-primary transition-colors truncate max-w-[140px]"
        >
          {course?.title ?? "…"}
        </Link>
        <ArrowRight className="h-3 w-3" />
        <Link
          to="/teacher/courses/$courseId/students"
          params={{ courseId }}
          className="hover:text-m3-primary transition-colors"
        >
          Students
        </Link>
        <ArrowRight className="h-3 w-3" />
        <span className="text-m3-on-surface font-medium truncate max-w-[160px]">
          {student.display_name}
        </span>
      </div>

      {/* ── Profile hero card ── */}
      <div className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            {/* Show the uploaded avatar when present, otherwise the
                colour-coded initials fallback. */}
            {student.avatar_url ? (
              <img
                src={student.avatar_url}
                alt=""
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div
                className={cn(
                  "w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 uppercase",
                  aColor,
                )}
              >
                {initials || "?"}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-headline font-bold text-m3-on-surface">
                  {student.display_name}
                </h1>
                <span
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    enroll.badge,
                  )}
                >
                  {enroll.label}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    risk.badge,
                  )}
                >
                  {risk.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-m3-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {student.primary_email}
                </span>
                <span className="opacity-30">·</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Enrolled {fmtDate(student.enrolled_at)}
                </span>
              </div>
            </div>
          </div>

          <Link to="/teacher/courses/$courseId/students" params={{ courseId }}>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-m3-outline-variant/30"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Roster
            </Button>
          </Link>
        </div>

        {/* Key metrics strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-m3-outline-variant/10">
          {[
            {
              label: "Course Progress",
              value: `${Math.round(student.progress_percent)}%`,
              icon: TrendingUp,
            },
            { label: "Risk Level", value: risk.label, icon: AlertTriangle },
            {
              label: "Last Active",
              value: relDate(student.last_activity_at),
              icon: Clock,
            },
            {
              label: "Final Grade",
              value: student.final_grade ?? "—",
              icon: CheckCircle2,
            },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <m.icon className="h-4 w-4 text-m3-secondary mx-auto mb-1" />
              <div className="text-xl font-headline font-black text-m3-primary">
                {m.value}
              </div>
              <div className="text-[10px] text-m3-on-surface-variant font-bold uppercase tracking-wide">
                {m.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 12-col grid ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* ── Main 8 cols ── */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Course progress */}
          <section className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-5">
            <h2 className="font-headline font-bold text-lg text-m3-on-surface">
              Course Progress
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-m3-on-surface">Overall completion</span>
                <span className="font-bold text-m3-primary">
                  {Math.round(student.progress_percent)}%
                </span>
              </div>
              <GradientProgress
                value={student.progress_percent}
                size="lg"
                variant={
                  student.progress_percent >= 100 ? "success" : "primary"
                }
              />
              <p className="text-xs text-m3-on-surface-variant">
                {student.progress_percent === 0
                  ? "Student has not started this course yet."
                  : student.progress_percent >= 100
                    ? "Course completed."
                    : `${Math.round(student.progress_percent)}% of course content completed.`}
              </p>
            </div>
          </section>

          {/* Quiz attempts */}
          <section className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-m3-secondary" />
              <h2 className="font-headline font-bold text-lg text-m3-on-surface">
                Quiz Attempts
              </h2>
            </div>
            <QuizAttemptsTable
              attempts={quizAttempts ?? []}
              loading={quizAttemptsLoading}
              showStudentColumn={false}
              onRowClick={(a) =>
                void navigate({
                  to: "/teacher/courses/$courseId/quizzes/$quizId",
                  params: { courseId, quizId: a.quiz_id },
                })
              }
            />
          </section>

          {/* Interview attempts */}
          <section className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-m3-secondary" />
                <h2 className="font-headline font-bold text-lg text-m3-on-surface">
                  Interview Attempts
                </h2>
              </div>
              {/* Filters: Interview / Result / Time — mirror the course
                  Assessments page so teachers get the same controls here. */}
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={ivInterviewFilter}
                  onValueChange={(next) => setIvInterviewFilter(next)}
                  size="sm"
                  className="w-44"
                  aria-label="Filter by interview"
                  options={[
                    { value: "all", label: "All interviews" },
                    ...ivInterviewTitles.map((title) => ({
                      value: title,
                      label: title,
                    })),
                  ]}
                />
                <Select
                  value={ivResultFilter}
                  onValueChange={(next) => setIvResultFilter(next)}
                  size="sm"
                  className="w-40"
                  aria-label="Filter by result"
                  options={[
                    { value: "all", label: "All results" },
                    { value: "passed", label: "Passed" },
                    { value: "not_passed", label: "Not passed" },
                    { value: "evaluating", label: "Evaluating" },
                    { value: "in_progress", label: "In progress" },
                    { value: "failed", label: "Evaluation failed" },
                    { value: "not_graded", label: "Not graded" },
                  ]}
                />
                <Select
                  value={ivTimeFilter}
                  onValueChange={(next) => setIvTimeFilter(next)}
                  size="sm"
                  className="w-36"
                  aria-label="Filter by time"
                  options={[
                    { value: "all", label: "All time" },
                    { value: "today", label: "Last 24 hours" },
                    { value: "7", label: "Last 7 days" },
                    { value: "30", label: "Last 30 days" },
                    { value: "90", label: "Last 90 days" },
                  ]}
                />
                {ivFiltersActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setIvInterviewFilter("all");
                      setIvResultFilter("all");
                      setIvTimeFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
            <InterviewSessionsTable
              sessions={filteredInterviewSessions}
              loading={interviewSessionsLoading}
              showStudentColumn={false}
              onRowClick={(s) =>
                void navigate({
                  to: "/teacher/interview-sessions/$sessionId/gap-report",
                  params: { sessionId: s.session_id },
                })
              }
            />
          </section>

          {/* Enrollment timeline */}
          <section className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-5">
            <h2 className="font-headline font-bold text-lg text-m3-on-surface">
              Enrollment Timeline
            </h2>

            <div className="space-y-0 relative">
              <div className="absolute left-5 top-5 bottom-5 w-px bg-m3-outline-variant/20" />

              {[
                {
                  icon: Calendar,
                  color: "text-m3-primary",
                  bg: "bg-m3-primary-fixed",
                  label: "Enrolled",
                  date: fmtDate(student.enrolled_at),
                  detail: `Joined via ${student.enrollment_status === "waitlisted" ? "waitlist" : "direct enrollment"}`,
                },
                ...(student.last_activity_at
                  ? [
                      {
                        icon: Clock,
                        color: "text-m3-secondary",
                        bg: "bg-m3-secondary-fixed",
                        label: "Last Activity",
                        date: relDate(student.last_activity_at),
                        detail: `Last seen ${fmtDate(student.last_activity_at)}`,
                      },
                    ]
                  : []),
                ...(student.completed_at
                  ? [
                      {
                        icon: CheckCircle2,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                        label: "Completed Course",
                        date: fmtDate(student.completed_at),
                        detail: student.final_grade
                          ? `Final grade: ${student.final_grade}`
                          : "No grade assigned",
                      },
                    ]
                  : []),
                ...(student.dropped_at
                  ? [
                      {
                        icon: UserMinus,
                        color: "text-slate-500",
                        bg: "bg-slate-100",
                        label: "Dropped",
                        date: fmtDate(student.dropped_at),
                        detail:
                          "Student dropped or was removed from the course",
                      },
                    ]
                  : []),
              ].map((entry, idx, arr) => (
                <div key={entry.label} className="flex gap-4 relative pb-6">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0",
                      entry.bg,
                    )}
                  >
                    <entry.icon className={cn("h-4 w-4", entry.color)} />
                  </div>
                  <div
                    className={cn(
                      "flex-1 pt-1.5",
                      idx < arr.length - 1 ? "pb-2" : "",
                    )}
                  >
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-sm font-semibold text-m3-on-surface">
                        {entry.label}
                      </p>
                      <span className="text-xs text-m3-on-surface-variant shrink-0 ml-3">
                        {entry.date}
                      </span>
                    </div>
                    <p className="text-sm text-m3-on-surface-variant">
                      {entry.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Sidebar 4 cols ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6 lg:sticky lg:top-24 self-start">
          {/* Enrollment management */}
          <div className="bg-m3-surface-container-lowest rounded-xl p-6 ghost-border shadow-editorial space-y-4">
            <h3 className="font-headline font-bold text-m3-primary text-base">
              Enrollment Management
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-m3-on-surface-variant">
                  Status
                </span>
                <span
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    enroll.badge,
                  )}
                >
                  {enroll.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-m3-on-surface-variant">
                  Risk Level
                </span>
                <span
                  className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    risk.badge,
                  )}
                >
                  {risk.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-m3-on-surface-variant">
                  Enrolled
                </span>
                <span className="text-xs font-medium text-m3-on-surface">
                  {fmtDate(student.enrolled_at)}
                </span>
              </div>
            </div>
          </div>

          {/* At-risk alert */}
          {(student.at_risk_level === "medium" ||
            student.at_risk_level === "high") && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-bold text-sm">Attention Needed</span>
              </div>
              <p className="text-xs text-amber-600 leading-relaxed">
                {student.at_risk_level === "high"
                  ? "This student is at high risk of dropping out. They have low activity or falling grades."
                  : "This student's activity has slowed. Consider reaching out to re-engage them."}
              </p>
              <a
                href={`mailto:${student.primary_email}`}
                className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5" />
                Email {student.display_name.split(" ")[0]}
              </a>
            </div>
          )}

          {/* Navigate back */}
          <div className="bg-m3-surface-container-lowest rounded-xl p-5 ghost-border shadow-editorial">
            <p className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-wider mb-3">
              Navigate
            </p>
            <Link
              to="/teacher/courses/$courseId/students"
              params={{ courseId }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-m3-surface-container-low transition-colors group cursor-pointer"
            >
              <span className="text-sm font-medium text-m3-on-surface">
                Back to Roster
              </span>
              <ChevronRight className="h-4 w-4 text-m3-on-surface-variant opacity-60 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              to="/teacher/courses/$courseId"
              params={{ courseId }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-m3-surface-container-low transition-colors group cursor-pointer"
            >
              <span className="text-sm font-medium text-m3-on-surface">
                Course Structure
              </span>
              <ChevronRight className="h-4 w-4 text-m3-on-surface-variant opacity-60 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

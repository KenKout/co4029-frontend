import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SectionHeader } from "@/components/ui/section-header";
import { Input } from "@/components/ui/input";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import { useCourseQuizAttempts } from "@/lib/api/hooks/quizzes";
import { useCourseInterviewSessions } from "@/lib/api/hooks/interviews";
import {
  QuizAttemptsTable,
  InterviewSessionsTable,
} from "@/routes/teacher/_components/assessment-tables";

type Tab = "quizzes" | "interviews";

/** Course-wide "Assessments" tab: every quiz attempt + interview session
 * across the whole course, in one place. Sibling to Progress / Students /
 * Retention — filterable by student name (student-dashboard brainstorm,
 * 2026-07-11). Row click drills into the quiz-manage page (quizzes) or the
 * gap-report page (interviews), same targets as the per-student profile.
 */
export default function CourseAssessmentsPage() {
  const navigate = useNavigate();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: course } = useTeacherCourseById(courseId);
  const { data: quizAttempts, isLoading: quizzesLoading } =
    useCourseQuizAttempts(courseId);
  const { data: interviewSessions, isLoading: interviewsLoading } =
    useCourseInterviewSessions(courseId);

  const [tab, setTab] = useState<Tab>("quizzes");
  const [search, setSearch] = useState("");
  // Dropdown filters (mirrored across both tabs): a title filter (which quiz /
  // which interview), a result filter (pass/fail/…), and a time window.
  const [titleFilter, setTitleFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  // Earliest timestamp allowed by the selected time window (null = no bound).
  const timeCutoff = useMemo(() => {
    if (timeFilter === "all") return null;
    const days = timeFilter === "today" ? 1 : Number(timeFilter);
    if (!Number.isFinite(days)) return null;
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }, [timeFilter]);

  // Distinct quiz / interview titles for the title dropdown, sorted A→Z.
  const quizTitles = useMemo(() => {
    const set = new Set<string>();
    for (const a of quizAttempts ?? []) set.add(a.quiz_title);
    return [...set].sort((x, y) => x.localeCompare(y));
  }, [quizAttempts]);
  const interviewTitles = useMemo(() => {
    const set = new Set<string>();
    for (const s of interviewSessions ?? []) set.add(s.interview_config_title);
    return [...set].sort((x, y) => x.localeCompare(y));
  }, [interviewSessions]);

  const filteredQuizAttempts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (quizAttempts ?? []).filter((a) => {
      if (
        q &&
        !(a.student_name ?? "").toLowerCase().includes(q) &&
        !a.quiz_title.toLowerCase().includes(q)
      )
        return false;
      if (titleFilter !== "all" && a.quiz_title !== titleFilter) return false;
      if (resultFilter !== "all") {
        const r =
          a.status === "in_progress"
            ? "in_progress"
            : a.passed === true
              ? "passed"
              : a.passed === false
                ? "not_passed"
                : "grading";
        if (r !== resultFilter) return false;
      }
      if (timeCutoff != null) {
        const ts = new Date(a.submitted_at ?? a.started_at).getTime();
        if (Number.isNaN(ts) || ts < timeCutoff) return false;
      }
      return true;
    });
  }, [quizAttempts, search, titleFilter, resultFilter, timeCutoff]);

  const filteredInterviewSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (interviewSessions ?? []).filter((s) => {
      if (
        q &&
        !(s.student_name ?? "").toLowerCase().includes(q) &&
        !s.interview_config_title.toLowerCase().includes(q)
      )
        return false;
      if (titleFilter !== "all" && s.interview_config_title !== titleFilter)
        return false;
      if (resultFilter !== "all") {
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
        if (r !== resultFilter) return false;
      }
      if (timeCutoff != null) {
        const ts = new Date(s.started_at).getTime();
        if (Number.isNaN(ts) || ts < timeCutoff) return false;
      }
      return true;
    });
  }, [interviewSessions, search, titleFilter, resultFilter, timeCutoff]);

  const distinctStudents = useMemo(() => {
    const ids = new Set<string>();
    for (const a of quizAttempts ?? []) ids.add(a.student_id);
    for (const s of interviewSessions ?? []) ids.add(s.student_id);
    return ids.size;
  }, [quizAttempts, interviewSessions]);

  const quizPassRate = useMemo(() => {
    const graded = (quizAttempts ?? []).filter((a) => a.passed !== null);
    if (graded.length === 0) return null;
    return (graded.filter((a) => a.passed).length / graded.length) * 100;
  }, [quizAttempts]);

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs
          items={[
            { label: "My Courses", to: "/teacher/courses" },
            {
              label: course?.title ?? "—",
              to: "/teacher/courses/$courseId",
              params: { courseId },
            },
            { label: "Assessments" },
          ]}
        />

        <div className="flex items-center gap-3">
          <Link
            to="/teacher/courses/$courseId"
            params={{ courseId }}
            className="p-2 rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-colors cursor-pointer"
            aria-label="Back to course"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <SectionHeader
            title="Assessments"
            subtitle="Every quiz attempt and interview session in this course."
          />
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile
            icon={Users}
            label="Students assessed"
            value={distinctStudents}
            loading={quizzesLoading || interviewsLoading}
          />
          <SummaryTile
            icon={ClipboardList}
            label="Quiz attempts"
            value={quizAttempts?.length ?? 0}
            loading={quizzesLoading}
          />
          <SummaryTile
            icon={CheckCircle2}
            label="Quiz pass rate"
            value={quizPassRate != null ? `${quizPassRate.toFixed(0)}%` : "—"}
            loading={quizzesLoading}
            tone="emerald"
          />
          <SummaryTile
            icon={MessageSquare}
            label="Interview sessions"
            value={interviewSessions?.length ?? 0}
            loading={interviewsLoading}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(["quizzes", "interviews"] as Tab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTab(key);
                  // Titles differ between tabs, so a title selection from the
                  // other tab would filter everything out — reset on switch.
                  setTitleFilter("all");
                }}
                className={
                  tab === key
                    ? "px-4 py-1.5 rounded-full text-sm font-medium bg-m3-primary text-white transition-colors"
                    : "px-4 py-1.5 rounded-full text-sm font-medium bg-m3-surface-container text-m3-on-surface-variant hover:bg-m3-surface-container-high transition-colors"
                }
              >
                {key === "quizzes" ? "Quizzes" : "Interviews"}
              </button>
            ))}
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by student or title…"
            className="max-w-xs h-9"
          />
        </div>

        {/* Dropdown filters — title (which quiz / interview), result, and time
            window. Mirrored across both tabs; the title options swap with the
            active tab. Native <select> is the app standard. */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            className="h-9 rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30"
          >
            <option value="all">
              {tab === "quizzes" ? "All quizzes" : "All interviews"}
            </option>
            {(tab === "quizzes" ? quizTitles : interviewTitles).map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="h-9 rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30"
          >
            <option value="all">All results</option>
            <option value="passed">Passed</option>
            <option value="not_passed">Not passed</option>
            {tab === "quizzes" ? (
              <>
                <option value="grading">Grading</option>
                <option value="in_progress">In progress</option>
              </>
            ) : (
              <>
                <option value="evaluating">Evaluating</option>
                <option value="in_progress">In progress</option>
                <option value="failed">Evaluation failed</option>
                <option value="not_graded">Not graded</option>
              </>
            )}
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="h-9 rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-m3-primary/30"
          >
            <option value="all">All time</option>
            <option value="today">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>

          {(titleFilter !== "all" ||
            resultFilter !== "all" ||
            timeFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setTitleFilter("all");
                setResultFilter("all");
                setTimeFilter("all");
              }}
              className="h-9 px-3 rounded-lg text-sm font-medium text-m3-on-surface-variant hover:bg-m3-surface-container transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4">
          {tab === "quizzes" ? (
            <QuizAttemptsTable
              attempts={filteredQuizAttempts}
              loading={quizzesLoading}
              showStudentColumn
              onRowClick={(a) =>
                void navigate({
                  to: "/teacher/courses/$courseId/quiz-attempts/$attemptId",
                  params: { courseId, attemptId: a.id },
                })
              }
            />
          ) : (
            <InterviewSessionsTable
              sessions={filteredInterviewSessions}
              loading={interviewsLoading}
              showStudentColumn
              onRowClick={(s) =>
                void navigate({
                  to: "/teacher/interview-sessions/$sessionId/gap-report",
                  params: { sessionId: s.session_id },
                })
              }
            />
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
        className={
          tone === "emerald"
            ? "p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0"
            : "p-2 rounded-lg bg-m3-primary-fixed text-m3-primary shrink-0"
        }
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-headline font-black text-m3-on-surface">
          {loading ? "…" : value}
        </div>
        <div className="text-[11px] text-m3-on-surface-variant font-bold uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  );
}

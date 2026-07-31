import { useMemo, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Users,
  X,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  useTeacherCourseById(courseId);
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

  // Active-filter chips — one removable chip per non-default filter, so the
  // teacher sees exactly what's narrowing the list and can clear each singly.
  const RESULT_LABELS: Record<string, string> = {
    passed: "Passed",
    not_passed: "Not passed",
    grading: "Grading",
    evaluating: "Evaluating",
    in_progress: "In progress",
    failed: "Evaluation failed",
    not_graded: "Not graded",
  };
  const TIME_LABELS: Record<string, string> = {
    today: "Last 24 hours",
    "7": "Last 7 days",
    "30": "Last 30 days",
    "90": "Last 90 days",
  };
  const activeChips = useMemo(() => {
    const chips: {
      key: string;
      prefix: string;
      label: string;
      onRemove: () => void;
    }[] = [];
    if (search.trim()) {
      chips.push({
        key: "search",
        prefix: "Search:",
        label: search.trim(),
        onRemove: () => setSearch(""),
      });
    }
    if (titleFilter !== "all") {
      chips.push({
        key: "title",
        prefix: tab === "quizzes" ? "Quiz:" : "Interview:",
        label: titleFilter,
        onRemove: () => setTitleFilter("all"),
      });
    }
    if (resultFilter !== "all") {
      chips.push({
        key: "result",
        prefix: "Result:",
        label: RESULT_LABELS[resultFilter] ?? resultFilter,
        onRemove: () => setResultFilter("all"),
      });
    }
    if (timeFilter !== "all") {
      chips.push({
        key: "time",
        prefix: "Time:",
        label: TIME_LABELS[timeFilter] ?? timeFilter,
        onRemove: () => setTimeFilter("all"),
      });
    }
    return chips;
  }, [search, titleFilter, resultFilter, timeFilter, tab]);

  const quizPassRate = useMemo(() => {
    const graded = (quizAttempts ?? []).filter((a) => a.passed !== null);
    if (graded.length === 0) return null;
    return (graded.filter((a) => a.passed).length / graded.length) * 100;
  }, [quizAttempts]);

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="pt-2">
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
            active tab. Uses the shared styled Select (ui/select.tsx), which is
            the app standard — native option lists are painted by the OS and
            ignore the app's tokens entirely. */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={titleFilter}
            onValueChange={(next) => setTitleFilter(next)}
            className="w-52"
            options={[
              {
                value: "all",
                label: tab === "quizzes" ? "All quizzes" : "All interviews",
              },
              ...(tab === "quizzes" ? quizTitles : interviewTitles).map(
                (title) => ({ value: title, label: title }),
              ),
            ]}
          />

          <Select
            value={resultFilter}
            onValueChange={(next) => setResultFilter(next)}
            className="w-44"
            options={[
              { value: "all", label: "All results" },
              { value: "passed", label: "Passed" },
              { value: "not_passed", label: "Not passed" },
              ...(tab === "quizzes"
                ? [
                    { value: "grading", label: "Grading" },
                    { value: "in_progress", label: "In progress" },
                  ]
                : [
                    { value: "evaluating", label: "Evaluating" },
                    { value: "in_progress", label: "In progress" },
                    { value: "failed", label: "Evaluation failed" },
                    { value: "not_graded", label: "Not graded" },
                  ]),
            ]}
          />

          <Select
            value={timeFilter}
            onValueChange={(next) => setTimeFilter(next)}
            className="w-40"
            options={[
              { value: "all", label: "All time" },
              { value: "today", label: "Last 24 hours" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
          />

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

        {/* Active-filter chips + result count — mirrors the courses page so
            the teacher can see and remove each active filter at a glance. */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1.5 rounded-full bg-m3-primary-fixed px-2.5 py-1 text-xs font-medium text-m3-primary transition-colors hover:bg-m3-primary/15"
              >
                <span className="text-m3-on-surface-variant">
                  {chip.prefix}
                </span>
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setTitleFilter("all");
                setResultFilter("all");
                setTimeFilter("all");
                setSearch("");
              }}
              className="text-xs font-medium text-m3-on-surface-variant underline underline-offset-2 hover:text-m3-on-surface"
            >
              Clear all
            </button>
          </div>
        )}

        <p className="text-xs text-m3-on-surface-variant">
          {tab === "quizzes"
            ? `Showing ${filteredQuizAttempts.length} of ${quizAttempts?.length ?? 0}`
            : `Showing ${filteredInterviewSessions.length} of ${interviewSessions?.length ?? 0}`}
        </p>

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4">
          {tab === "quizzes" ? (
            <QuizAttemptsTable
              attempts={filteredQuizAttempts}
              loading={quizzesLoading}
              showStudentColumn
              emptyState={
                (quizAttempts?.length ?? 0) === 0
                  ? "No quiz attempts yet."
                  : "No attempts match your filters."
              }
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
              emptyState={
                (interviewSessions?.length ?? 0) === 0
                  ? "No interview attempts yet."
                  : "No attempts match your filters."
              }
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

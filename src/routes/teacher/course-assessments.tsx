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

  const filteredQuizAttempts = useMemo(() => {
    const rows = quizAttempts ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (a) =>
        (a.student_name ?? "").toLowerCase().includes(q) ||
        a.quiz_title.toLowerCase().includes(q),
    );
  }, [quizAttempts, search]);

  const filteredInterviewSessions = useMemo(() => {
    const rows = interviewSessions ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        (s.student_name ?? "").toLowerCase().includes(q) ||
        s.interview_config_title.toLowerCase().includes(q),
    );
  }, [interviewSessions, search]);

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
                onClick={() => setTab(key)}
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

        <section className="bg-m3-surface-container-lowest rounded-xl ghost-border shadow-editorial p-4">
          {tab === "quizzes" ? (
            <QuizAttemptsTable
              attempts={filteredQuizAttempts}
              loading={quizzesLoading}
              showStudentColumn
              onRowClick={(a) =>
                void navigate({
                  to: "/teacher/courses/$courseId/quizzes/$quizId",
                  params: { courseId, quizId: a.quiz_id },
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

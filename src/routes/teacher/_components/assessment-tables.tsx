import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { InterviewSessionTeacherRead, QuizAttemptTeacherRead } from "@/lib/api/types";

/**
 * Shared teacher-facing tables for quiz attempts + interview sessions.
 * Used by both the per-student profile (course-student-detail.tsx) and the
 * course-wide Assessments tab (course-assessments.tsx) so the row shape and
 * status badges stay consistent between the two views.
 */

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function QuizStatusBadge({ attempt }: { attempt: QuizAttemptTeacherRead }) {
  if (attempt.status === "in_progress") {
    return (
      <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600 gap-1">
        <Loader2 className="h-3 w-3" />
        In progress
      </Badge>
    );
  }
  if (attempt.passed === true) {
    return (
      <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-700 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Passed
      </Badge>
    );
  }
  if (attempt.passed === false) {
    return (
      <Badge className="text-[10px] border-0 bg-red-100 text-red-700 gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return <Badge className="text-[10px] border-0 bg-amber-50 text-amber-700">Grading…</Badge>;
}

export interface QuizAttemptsTableProps {
  attempts: QuizAttemptTeacherRead[];
  loading?: boolean;
  /** Omit the quiz-title column (e.g. when already scoped to one quiz). */
  showQuizColumn?: boolean;
  /** Omit the student column (e.g. when already scoped to one student). */
  showStudentColumn?: boolean;
  onRowClick?: (attempt: QuizAttemptTeacherRead) => void;
}

export function QuizAttemptsTable({
  attempts,
  loading = false,
  showQuizColumn = true,
  showStudentColumn = false,
  onRowClick,
}: QuizAttemptsTableProps) {
  const columns: DataTableColumn<QuizAttemptTeacherRead>[] = [
    ...(showStudentColumn
      ? [
          {
            id: "student",
            header: "Student",
            cell: (a: QuizAttemptTeacherRead) => (
              <span className="font-medium text-m3-on-surface">
                {a.student_name ?? a.student_id}
              </span>
            ),
          } satisfies DataTableColumn<QuizAttemptTeacherRead>,
        ]
      : []),
    ...(showQuizColumn
      ? [
          {
            id: "quiz",
            header: "Quiz",
            cell: (a: QuizAttemptTeacherRead) => (
              <span className="font-medium text-m3-on-surface">{a.quiz_title}</span>
            ),
          } satisfies DataTableColumn<QuizAttemptTeacherRead>,
        ]
      : []),
    {
      id: "attempt",
      header: "Attempt",
      cell: (a) => <span className="text-m3-on-surface-variant">#{a.attempt_number}</span>,
    },
    {
      id: "score",
      header: "Score",
      cell: (a) =>
        a.score_percent != null ? (
          <span className="font-bold text-m3-primary">{Number(a.score_percent).toFixed(0)}%</span>
        ) : (
          <span className="text-m3-on-surface-variant">—</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (a) => <QuizStatusBadge attempt={a} />,
    },
    {
      id: "submitted",
      header: "Submitted",
      cell: (a) => (
        <span className="text-xs text-m3-on-surface-variant whitespace-nowrap">
          {fmtDateTime(a.submitted_at ?? a.started_at)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={attempts}
      getRowId={(a) => a.id}
      loading={loading}
      onRowClick={onRowClick}
      pagination={attempts.length > 10}
      pageSize={10}
      emptyState="No quiz attempts yet."
    />
  );
}

function InterviewVerdictBadge({ session }: { session: InterviewSessionTeacherRead }) {
  if (session.status === "in_progress") {
    return (
      <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600 gap-1">
        <Loader2 className="h-3 w-3" />
        In progress
      </Badge>
    );
  }
  if (session.pass_verdict === true) {
    return (
      <Badge className="text-[10px] border-0 bg-emerald-100 text-emerald-700 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Passed
      </Badge>
    );
  }
  if (session.pass_verdict === false) {
    return (
      <Badge className="text-[10px] border-0 bg-red-100 text-red-700 gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return <Badge className="text-[10px] border-0 bg-amber-50 text-amber-700">Evaluating…</Badge>;
}

export interface InterviewSessionsTableProps {
  sessions: InterviewSessionTeacherRead[];
  loading?: boolean;
  showConfigColumn?: boolean;
  showStudentColumn?: boolean;
  onRowClick?: (session: InterviewSessionTeacherRead) => void;
}

export function InterviewSessionsTable({
  sessions,
  loading = false,
  showConfigColumn = true,
  showStudentColumn = false,
  onRowClick,
}: InterviewSessionsTableProps) {
  const columns: DataTableColumn<InterviewSessionTeacherRead>[] = [
    ...(showStudentColumn
      ? [
          {
            id: "student",
            header: "Student",
            cell: (s: InterviewSessionTeacherRead) => (
              <span className="font-medium text-m3-on-surface">
                {s.student_name ?? s.student_id}
              </span>
            ),
          } satisfies DataTableColumn<InterviewSessionTeacherRead>,
        ]
      : []),
    ...(showConfigColumn
      ? [
          {
            id: "config",
            header: "Interview",
            cell: (s: InterviewSessionTeacherRead) => (
              <span className="font-medium text-m3-on-surface">{s.interview_config_title}</span>
            ),
          } satisfies DataTableColumn<InterviewSessionTeacherRead>,
        ]
      : []),
    {
      id: "attempt",
      header: "Attempt",
      cell: (s) => <span className="text-m3-on-surface-variant">#{s.attempt_number}</span>,
    },
    {
      id: "mode",
      header: "Mode",
      cell: (s) => <span className="text-m3-on-surface-variant capitalize">{s.input_mode}</span>,
    },
    {
      id: "status",
      header: "Result",
      cell: (s) => <InterviewVerdictBadge session={s} />,
    },
    {
      id: "started",
      header: "Started",
      cell: (s) => (
        <span className="text-xs text-m3-on-surface-variant whitespace-nowrap">
          {fmtDateTime(s.started_at)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={sessions}
      getRowId={(s) => s.session_id}
      loading={loading}
      onRowClick={onRowClick}
      pagination={sessions.length > 10}
      pageSize={10}
      emptyState="No interview attempts yet."
    />
  );
}

import {
  CheckCircle2,
  XCircle,
  Loader2,
  MinusCircle,
  ShieldAlert,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatDateTimeMedium } from "@/lib/format/date";
import type {
  InterviewSessionTeacherRead,
  QuizAttemptTeacherRead,
} from "@/lib/api/types";

/** The tables' date cells: locale-aware medium date + time (or em dash). */
function useTableDateFormatter() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "vi" ? "vi-VN" : "en-US";
  return (iso: string | null | undefined) => formatDateTimeMedium(iso, locale);
}

/**
 * Proctoring flag count for one attempt.
 *
 * The events themselves live on the attempt-detail page; this is the pointer
 * to them. Without it the only way to discover that an attempt had tab
 * switches or fullscreen exits was to open every attempt in the course one at
 * a time, which in a real cohort means nobody ever did.
 *
 * A clean attempt renders an em dash, not a green tick: zero flags is the
 * ordinary case, and decorating it would drown the few rows that need a look.
 */
function IntegrityFlagCell({ count }: { count: number }) {
  if (count <= 0) {
    return <span className="text-m3-on-surface-variant">—</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 font-semibold text-amber-700"
      title={`${count} proctoring signal${count === 1 ? "" : "s"} recorded — open the attempt to review`}
    >
      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
      {count}
    </span>
  );
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
  return (
    <Badge className="text-[10px] border-0 bg-amber-50 text-amber-700">
      Grading…
    </Badge>
  );
}

export interface QuizAttemptsTableProps {
  attempts: QuizAttemptTeacherRead[];
  loading?: boolean;
  /** Omit the quiz-title column (e.g. when already scoped to one quiz). */
  showQuizColumn?: boolean;
  /** Omit the student column (e.g. when already scoped to one student). */
  showStudentColumn?: boolean;
  /** Empty-state copy — lets the caller distinguish first-run vs no-match. */
  emptyState?: string;
  onRowClick?: (attempt: QuizAttemptTeacherRead) => void;
}

export function QuizAttemptsTable({
  attempts,
  loading = false,
  showQuizColumn = true,
  showStudentColumn = false,
  emptyState = "No quiz attempts yet.",
  onRowClick,
}: QuizAttemptsTableProps) {
  const fmtDate = useTableDateFormatter();
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
              <span className="font-medium text-m3-on-surface">
                {a.quiz_title}
              </span>
            ),
          } satisfies DataTableColumn<QuizAttemptTeacherRead>,
        ]
      : []),
    {
      id: "attempt",
      header: "Attempt",
      cell: (a) => (
        <span className="text-m3-on-surface-variant">#{a.attempt_number}</span>
      ),
    },
    {
      id: "score",
      header: "Score",
      cell: (a) =>
        a.score_percent != null ? (
          <span className="font-bold text-m3-primary">
            {Number(a.score_percent).toFixed(0)}%
          </span>
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
      id: "integrity",
      header: "Flags",
      cell: (a) => <IntegrityFlagCell count={a.integrity_flags ?? 0} />,
    },
    {
      id: "submitted",
      header: "Submitted",
      cell: (a) => (
        <span className="text-xs text-m3-on-surface-variant whitespace-nowrap">
          {fmtDate(a.submitted_at ?? a.started_at)}
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
      emptyState={emptyState}
    />
  );
}

function InterviewVerdictBadge({
  session,
}: {
  session: InterviewSessionTeacherRead;
}) {
  if (session.status === "in_progress") {
    return (
      <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600 gap-1">
        <Loader2 className="h-3 w-3" />
        In progress
      </Badge>
    );
  }
  if (session.status === "failed") {
    return (
      <Badge className="text-[10px] border-0 bg-red-100 text-red-700 gap-1">
        <XCircle className="h-3 w-3" />
        Evaluation failed
      </Badge>
    );
  }
  if (session.status === "abandoned") {
    return (
      <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600 gap-1">
        <MinusCircle className="h-3 w-3" />
        Not graded
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
  return (
    <Badge className="text-[10px] border-0 bg-amber-50 text-amber-700">
      Evaluating…
    </Badge>
  );
}

export interface InterviewSessionsTableProps {
  sessions: InterviewSessionTeacherRead[];
  loading?: boolean;
  showConfigColumn?: boolean;
  showStudentColumn?: boolean;
  /** Empty-state copy — lets the caller distinguish first-run vs no-match. */
  emptyState?: string;
  onRowClick?: (session: InterviewSessionTeacherRead) => void;
}

export function InterviewSessionsTable({
  sessions,
  loading = false,
  showConfigColumn = true,
  showStudentColumn = false,
  emptyState = "No interview attempts yet.",
  onRowClick,
}: InterviewSessionsTableProps) {
  const fmtDate = useTableDateFormatter();
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
              <span className="font-medium text-m3-on-surface">
                {s.interview_config_title}
              </span>
            ),
          } satisfies DataTableColumn<InterviewSessionTeacherRead>,
        ]
      : []),
    {
      id: "attempt",
      header: "Attempt",
      cell: (s) => (
        <span className="text-m3-on-surface-variant">#{s.attempt_number}</span>
      ),
    },
    {
      id: "mode",
      header: "Mode",
      cell: (s) => (
        <span className="text-m3-on-surface-variant capitalize">
          {s.input_mode}
        </span>
      ),
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
          {fmtDate(s.started_at)}
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
      emptyState={emptyState}
    />
  );
}

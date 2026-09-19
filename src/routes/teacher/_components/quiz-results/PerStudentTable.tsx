import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";

import { QuizResultsDataTable } from "./QuizResultsDataTable";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";
import { UserEmailIdentity } from "@/components/ui/user-identity";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QuizPerStudentRow } from "@/lib/api/types";

type HeadlineMetric = "best" | "latest";

interface PerStudentTableProps {
  rows: QuizPerStudentRow[];
  passingScorePercent: number;
  headlineMetric: HeadlineMetric;
  onHeadlineMetricChange: (m: HeadlineMetric) => void;
  onStudentClick?: (studentId: string) => void;
}

function parseScore(value: string | null): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function PerStudentTable({
  rows,
  passingScorePercent,
  headlineMetric,
  onHeadlineMetricChange,
  onStudentClick,
}: PerStudentTableProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const statusFilter: FilterDef = {
    id: "status",
    label: t("teacher_quiz_results.filters.status"),
    options: [
      { value: "all", label: t("teacher_quiz_results.filters.all") },
      { value: "passed", label: t("teacher_quiz_results.per_student.passed") },
      { value: "failed", label: t("teacher_quiz_results.per_student.failed") },
      { value: "ungraded", label: t("teacher_quiz_results.filters.ungraded") },
    ],
  };
  const scoreFilter: FilterDef = {
    id: "score",
    label: t("teacher_quiz_results.filters.score"),
    options: [
      { value: "best", label: t("teacher_quiz_results.per_student.toggle_best") },
      { value: "latest", label: t("teacher_quiz_results.per_student.toggle_latest") },
    ],
  };
  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      const name = row.student_name ?? "";
      const email = row.student_email ?? "";
      const matchesSearch = !needle ||
        `${name} ${email} ${row.student_id}`.toLowerCase().includes(needle);
      const matchesStatus =
        status === "all" ||
        (status === "passed" && row.passed === true) ||
        (status === "failed" && row.passed === false) ||
        (status === "ungraded" && row.passed === null);
      return matchesSearch && matchesStatus;
    });
  }, [rows, search, status]);

  const renderScoreCell = (value: string | null) => {
    const score = parseScore(value);
    if (score === null) return <span className="text-m3-on-surface-variant">—</span>;
    return (
      <span className={cn("font-medium tabular-nums", score >= passingScorePercent ? "text-emerald-600" : "text-amber-600")}>
        {score.toFixed(2)}%
      </span>
    );
  };

  const columns: DataTableColumn<QuizPerStudentRow>[] = [
    {
      id: "student",
      header: t("teacher_quiz_results.per_student.col_student"),
      cell: (row) => (
        <UserEmailIdentity
          id={row.student_id}
          displayName={row.student_name ?? row.student_email ?? row.student_id}
          avatarUrl={row.student_avatar_url}
          email={row.student_email}
        />
      ),
      cellClassName: "font-medium",
    },
    {
      id: "score",
      header: headlineMetric === "best"
        ? t("teacher_quiz_results.per_student.toggle_best")
        : t("teacher_quiz_results.per_student.toggle_latest"),
      align: "right",
      sortable: true,
      sortValue: (row) => parseScore(
        headlineMetric === "best" ? row.best_score_percent : row.latest_score_percent,
      ) ?? -1,
      cell: (row) => renderScoreCell(
        headlineMetric === "best" ? row.best_score_percent : row.latest_score_percent,
      ),
    },
    {
      id: "attempts",
      header: t("teacher_quiz_results.per_student.col_attempts"),
      align: "right",
      sortable: true,
      sortValue: (row) => row.attempts_count,
      cell: (row) => <span className="tabular-nums">{row.attempts_count}</span>,
    },
    {
      id: "status",
      header: t("teacher_quiz_results.per_student.col_status"),
      align: "center",
      cell: (row) => row.passed === null ? (
        <span className="text-m3-on-surface-variant">—</span>
      ) : row.passed ? (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700"><CheckCircle2 />{t("teacher_quiz_results.per_student.passed")}</Badge>
      ) : (
        <Badge variant="destructive"><XCircle />{t("teacher_quiz_results.per_student.failed")}</Badge>
      ),
    },
    {
      id: "last_attempt",
      header: t("teacher_quiz_results.per_student.col_last_attempt"),
      align: "right",
      sortable: true,
      sortValue: (row) => row.last_attempt_at ? new Date(row.last_attempt_at) : new Date(0),
      cell: (row) => row.last_attempt_at ? (
        <span className="tabular-nums">{new Date(row.last_attempt_at).toLocaleString()}</span>
      ) : <span className="text-m3-on-surface-variant">—</span>,
    },
  ];

  return (
    <div className="space-y-3">

      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("teacher_quiz_results.filters.search_students")}
        filters={[statusFilter, scoreFilter]}
        filterValues={{ status, score: headlineMetric }}
        onFilterChange={(id, value) => {
          if (id === "score") onHeadlineMetricChange((value ?? "best") as HeadlineMetric);
          else setStatus(value ?? "all");
        }}
      />
      <QuizResultsDataTable
        columns={columns}
        data={filteredRows}
        getRowId={(row) => row.student_id}
        onRowClick={onStudentClick ? (row) => onStudentClick(row.student_id) : undefined}
        emptyState={t("teacher_quiz_results.per_student.empty")}
        bordered={false}
        containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card"
      />
    </div>
  );
}

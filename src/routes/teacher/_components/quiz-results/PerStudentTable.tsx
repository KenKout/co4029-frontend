import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";
import { UserEmailIdentity } from "@/components/ui/user-identity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          email={row.student_email}
        />
      ),
      cellClassName: "font-medium",
    },
    {
      id: "best",
      header: t("teacher_quiz_results.per_student.col_best"),
      align: "right",
      sortable: true,
      sortValue: (row) => parseScore(row.best_score_percent) ?? -1,
      cell: (row) => renderScoreCell(row.best_score_percent),
      headerClassName: cn("text-right", headlineMetric === "best" && "font-semibold text-m3-on-surface"),
    },
    {
      id: "latest",
      header: t("teacher_quiz_results.per_student.col_latest"),
      align: "right",
      sortable: true,
      sortValue: (row) => parseScore(row.latest_score_percent) ?? -1,
      cell: (row) => renderScoreCell(row.latest_score_percent),
      headerClassName: cn("text-right", headlineMetric === "latest" && "font-semibold text-m3-on-surface"),
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
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" type="button" onClick={() => onHeadlineMetricChange("best")} aria-pressed={headlineMetric === "best"}>
          {t("teacher_quiz_results.per_student.toggle_best")}
        </Button>
        <Button variant="outline" type="button" onClick={() => onHeadlineMetricChange("latest")} aria-pressed={headlineMetric === "latest"}>
          {t("teacher_quiz_results.per_student.toggle_latest")}
        </Button>
      </div>
      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("teacher_quiz_results.filters.search_students")}
        filters={[statusFilter]}
        filterValues={{ status }}
        onFilterChange={(_, value) => setStatus(value ?? "all")}
      />
      <DataTable
        columns={columns}
        data={filteredRows}
        getRowId={(row) => row.student_id}
        onRowClick={onStudentClick ? (row) => onStudentClick(row.student_id) : undefined}
        emptyState={t("teacher_quiz_results.per_student.empty")}
        pagination
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        bordered={false}
        containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card"
      />
    </div>
  );
}

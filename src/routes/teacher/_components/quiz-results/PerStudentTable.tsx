import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";

import { QuizResultsDataTable } from "./QuizResultsDataTable";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DataTableToolbar,
  type FilterDef,
} from "@/components/ui/data-table-toolbar";
import { UserEmailIdentity } from "@/components/ui/user-identity";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
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

function studentStatusFilter(t: (key: string) => string): FilterDef {
  return {
    id: "status",
    label: t("teacher_quiz_results.filters.status"),
    allLabel: t("teacher_quiz_results.filters.all_statuses"),
    options: [
      { value: "passed", label: t("teacher_quiz_results.per_student.passed") },
      { value: "failed", label: t("teacher_quiz_results.per_student.failed") },
      { value: "ungraded", label: t("teacher_quiz_results.filters.ungraded") },
    ],
  };
}

function ScoreCell({
  value,
  passingScore,
}: {
  value: string | null;
  passingScore: number;
}) {
  const score = parseScore(value);
  if (score === null)
    return <span className="text-m3-on-surface-variant">—</span>;
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        score >= passingScore ? "text-emerald-600" : "text-amber-600",
      )}
    >
      {score.toFixed(2)}%
    </span>
  );
}

function ScoreMetricSelect({
  value,
  onChange,
  t,
}: {
  value: HeadlineMetric;
  onChange: (value: HeadlineMetric) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-sm text-m3-on-surface-variant">
        {t("teacher_quiz_results.filters.score_shown")}
      </span>
      <Select
        aria-label={t("teacher_quiz_results.filters.score_shown")}
        value={value}
        onValueChange={onChange}
        options={[
          {
            value: "best",
            label: t("teacher_quiz_results.per_student.toggle_best"),
          },
          {
            value: "latest",
            label: t("teacher_quiz_results.per_student.toggle_latest"),
          },
        ]}
        className="w-44"
      />
    </div>
  );
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
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("all");
  const statusFilter = studentStatusFilter(t);
  const filteredRows = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    return rows.filter((row) => {
      const name = row.student_name ?? "";
      const email = row.student_email ?? "";
      const matchesSearch =
        !needle ||
        `${name} ${email} ${row.student_id}`.toLowerCase().includes(needle);
      const matchesStatus =
        status === "all" ||
        (status === "passed" && row.passed === true) ||
        (status === "failed" && row.passed === false) ||
        (status === "ungraded" && row.passed === null);
      return matchesSearch && matchesStatus;
    });
  }, [rows, debouncedSearch, status]);

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
      header:
        headlineMetric === "best"
          ? t("teacher_quiz_results.per_student.toggle_best")
          : t("teacher_quiz_results.per_student.toggle_latest"),
      align: "right",
      sortable: true,
      sortValue: (row) =>
        parseScore(
          headlineMetric === "best"
            ? row.best_score_percent
            : row.latest_score_percent,
        ) ?? -1,
      cell: (row) => (
        <ScoreCell
          value={
            headlineMetric === "best"
              ? row.best_score_percent
              : row.latest_score_percent
          }
          passingScore={passingScorePercent}
        />
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
      cell: (row) =>
        row.passed === null ? (
          <span className="text-m3-on-surface-variant">—</span>
        ) : row.passed ? (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700"
          >
            <CheckCircle2 />
            {t("teacher_quiz_results.per_student.passed")}
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle />
            {t("teacher_quiz_results.per_student.failed")}
          </Badge>
        ),
    },
    {
      id: "last_attempt",
      header: t("teacher_quiz_results.per_student.col_last_attempt"),
      align: "right",
      sortable: true,
      sortValue: (row) =>
        row.last_attempt_at ? new Date(row.last_attempt_at) : new Date(0),
      cell: (row) =>
        row.last_attempt_at ? (
          <span className="tabular-nums">
            {new Date(row.last_attempt_at).toLocaleString()}
          </span>
        ) : (
          <span className="text-m3-on-surface-variant">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("teacher_quiz_results.filters.search_students")}
        filters={[statusFilter]}
        filterValues={{ status }}
        onFilterChange={(_, value) => setStatus(value ?? "all")}
        trailing={
          <ScoreMetricSelect
            value={headlineMetric}
            onChange={onHeadlineMetricChange}
            t={t}
          />
        }
      />
      <QuizResultsDataTable
        columns={columns}
        data={filteredRows}
        getRowId={(row) => row.student_id}
        onRowClick={
          onStudentClick ? (row) => onStudentClick(row.student_id) : undefined
        }
        emptyState={t("teacher_quiz_results.per_student.empty")}
        bordered={false}
        containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card"
      />
    </div>
  );
}

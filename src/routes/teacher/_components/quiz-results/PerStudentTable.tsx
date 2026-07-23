import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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

/** Parse a Decimal-serialized score string into a number, or null. */
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

  const renderScoreCell = (value: string | null) => {
    const score = parseScore(value);
    if (score === null) {
      return <span className="text-m3-on-surface-variant">—</span>;
    }
    const passing = score >= passingScorePercent;
    return (
      <span
        className={cn(
          "font-medium tabular-nums",
          passing ? "text-emerald-600" : "text-amber-600",
        )}
      >
        {score.toFixed(2)}%
      </span>
    );
  };

  const columns: DataTableColumn<QuizPerStudentRow>[] = [
    {
      id: "student",
      header: t("teacher_quiz_results.per_student.col_student"),
      cell: (row) => row.student_name ?? "—",
      cellClassName: "font-medium",
    },
    {
      id: "best",
      header: t("teacher_quiz_results.per_student.col_best"),
      align: "right",
      sortable: true,
      sortValue: (row) => parseScore(row.best_score_percent) ?? -1,
      cell: (row) => renderScoreCell(row.best_score_percent),
      headerClassName: cn(
        "text-right",
        headlineMetric === "best" && "font-semibold text-m3-on-surface",
      ),
    },
    {
      id: "latest",
      header: t("teacher_quiz_results.per_student.col_latest"),
      align: "right",
      sortable: true,
      sortValue: (row) => parseScore(row.latest_score_percent) ?? -1,
      cell: (row) => renderScoreCell(row.latest_score_percent),
      headerClassName: cn(
        "text-right",
        headlineMetric === "latest" && "font-semibold text-m3-on-surface",
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
      cell: (row) => {
        if (row.passed === null) {
          return <span className="text-m3-on-surface-variant">—</span>;
        }
        return row.passed ? (
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
        );
      },
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
      <div className="inline-flex items-center gap-1 rounded-full bg-m3-surface-container-low p-1">
        <button
          type="button"
          onClick={() => onHeadlineMetricChange("best")}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors cursor-pointer",
            headlineMetric === "best"
              ? "bg-m3-primary text-m3-on-primary"
              : "text-m3-on-surface-variant hover:bg-m3-surface-container",
          )}
        >
          {t("teacher_quiz_results.per_student.toggle_best")}
        </button>
        <button
          type="button"
          onClick={() => onHeadlineMetricChange("latest")}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors cursor-pointer",
            headlineMetric === "latest"
              ? "bg-m3-primary text-m3-on-primary"
              : "text-m3-on-surface-variant hover:bg-m3-surface-container",
          )}
        >
          {t("teacher_quiz_results.per_student.toggle_latest")}
        </button>
      </div>

      <DataTable<QuizPerStudentRow>
        columns={columns}
        data={rows}
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

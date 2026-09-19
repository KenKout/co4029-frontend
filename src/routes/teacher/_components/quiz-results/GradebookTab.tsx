import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  DataTableToolbar,
  type FilterDef,
} from "@/components/ui/data-table-toolbar";
import { UserEmailIdentity } from "@/components/ui/user-identity";
import { useQuizGradebook, type QuizGradeRow } from "@/lib/api/hooks/quizzes";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { QuizResultsDataTable } from "./QuizResultsDataTable";

function gradebookStatusFilter(t: (key: string) => string): FilterDef {
  return {
    id: "status",
    label: t("teacher_quiz_results.filters.status"),
    allLabel: t("teacher_quiz_results.filters.all_statuses"),
    options: [
      { value: "passed", label: t("teacher_quiz_results.gradebook.passed") },
      { value: "failed", label: t("teacher_quiz_results.gradebook.failed") },
    ],
  };
}

export function GradebookTab({
  quizId,
  downloading,
  onDownload,
}: {
  quizId: string;
  downloading: boolean;
  onDownload: (format: "csv" | "xlsx") => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuizGradebook(quizId);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState("all");
  const statusFilter = gradebookStatusFilter(t);
  const rows = useMemo(
    () =>
      (data ?? []).filter((row) => {
        const needle = debouncedSearch.trim().toLowerCase();
        const matchesSearch =
          !needle ||
          `${row.student_name ?? ""} ${row.student_email ?? ""} ${row.student_id}`
            .toLowerCase()
            .includes(needle);
        const matchesStatus =
          status === "all" ||
          (status === "passed" && row.passed) ||
          (status === "failed" && !row.passed);
        return matchesSearch && matchesStatus;
      }),
    [data, debouncedSearch, status],
  );

  const columns: DataTableColumn<QuizGradeRow>[] = [
    {
      id: "student",
      header: t("teacher_quiz_results.gradebook.col_student"),
      cell: (row) => (
        <UserEmailIdentity
          id={row.student_id}
          displayName={row.student_name ?? row.student_email ?? row.student_id}
          avatarUrl={row.student_avatar_url}
          email={row.student_email}
        />
      ),
    },
    {
      id: "grade",
      header: t("teacher_quiz_results.gradebook.col_grade"),
      align: "right",
      sortable: true,
      sortValue: (row) => Number(row.grade_percent),
      cell: (row) => (
        <span className="font-semibold tabular-nums">
          {Number(row.grade_percent).toFixed(1)}%
        </span>
      ),
    },
    {
      id: "passed",
      header: t("teacher_quiz_results.gradebook.col_passed"),
      align: "center",
      cell: (row) => (
        <span
          className={cn(
            "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
            row.passed
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700",
          )}
        >
          {row.passed
            ? t("teacher_quiz_results.gradebook.passed")
            : t("teacher_quiz_results.gradebook.failed")}
        </span>
      ),
    },
    {
      id: "method",
      header: t("teacher_quiz_results.gradebook.col_method"),
      cell: (row) => row.grading_method,
    },
    {
      id: "attempts",
      header: t("teacher_quiz_results.gradebook.col_attempts"),
      align: "right",
      sortable: true,
      sortValue: (row) => row.attempts_counted,
      cell: (row) => (
        <span className="tabular-nums">{row.attempts_counted}</span>
      ),
    },
  ];

  if (isLoading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-m3-secondary" />
      </div>
    );

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
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={downloading}
              onClick={() => onDownload("csv")}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={downloading}
              onClick={() => onDownload("xlsx")}
            >
              <Download className="h-4 w-4" />
              XLSX
            </Button>
          </div>
        }
      />
      <QuizResultsDataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.student_id}
        emptyState={t("teacher_quiz_results.gradebook.empty")}
        bordered={false}
        containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card"
      />
    </div>
  );
}

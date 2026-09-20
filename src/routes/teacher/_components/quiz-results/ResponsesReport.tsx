import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";

import type { DataTableColumn } from "@/components/ui/data-table";
import { QuizResultsDataTable } from "./QuizResultsDataTable";
import {
  DataTableToolbar,
  type FilterDef,
} from "@/components/ui/data-table-toolbar";
import { UserEmailIdentity } from "@/components/ui/user-identity";
import { cn } from "@/lib/utils";
import { useServerTable } from "@/lib/api/use-server-table";
import type { ResponsesReportRow } from "@/lib/api/hooks/quizzes";

export function ResponsesReport({
  quizId,
  trailing,
}: {
  quizId: string;
  trailing?: ReactNode;
}) {
  const { t } = useTranslation();
  const [result, setResult] = useState("all");
  const table = useServerTable<ResponsesReportRow>({
    queryKey: ["quiz-results", quizId, "responses"],
    path: `/teacher/quizzes/${quizId}/reports/responses`,
    filters: { result: result === "all" ? undefined : result },
  });
  const resultFilter: FilterDef = {
    id: "result",
    label: t("teacher_quiz_results.filters.result"),
    allLabel: t("teacher_quiz_results.filters.all_results"),
    options: [
      { value: "all", label: t("teacher_quiz_results.filters.all") },
      { value: "correct", label: t("teacher_quiz_results.filters.correct") },
      {
        value: "incorrect",
        label: t("teacher_quiz_results.filters.incorrect"),
      },
    ],
  };
  const columns: DataTableColumn<ResponsesReportRow>[] = [
    {
      id: "student",
      header: t("teacher_quiz_results.reports.responses.student"),
      sortable: true,
      sortValue: (row) => row.student_name ?? row.student_email ?? row.student_id,
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
      id: "question",
      header: t("teacher_quiz_results.reports.responses.question"),
      sortable: true,
      sortValue: (row) => row.prompt_text,
      cell: (row) => (
        <span className="block max-w-xs truncate" title={row.prompt_text}>
          {row.prompt_text}
        </span>
      ),
    },
    {
      id: "answer",
      header: t("teacher_quiz_results.reports.responses.their_answer"),
      cell: (row) => (
        <span className="block max-w-xs truncate" title={row.student_answer}>
          {row.student_answer || "—"}
        </span>
      ),
    },
    {
      id: "correct_answer",
      header: t("teacher_quiz_results.reports.responses.correct_answer"),
      cell: (row) => (
        <span className="block max-w-xs truncate" title={row.correct_answer}>
          {row.correct_answer || "—"}
        </span>
      ),
    },
    {
      id: "result",
      header: t("teacher_quiz_results.reports.responses.is_correct"),
      align: "center",
      cell: (row) => (
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-full",
            row.is_correct
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700",
          )}
        >
          {row.is_correct ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </span>
      ),
    },
    {
      id: "points",
      header: t("teacher_quiz_results.reports.responses.points"),
      align: "right",
      sortable: true,
      sortValue: (row) => row.points_awarded,
      cell: (row) => (
        <span className="tabular-nums">
          {Number(row.points_awarded).toFixed(2)}
        </span>
      ),
    },
  ];
  return (
    <div className="space-y-3">
      <DataTableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t("teacher_quiz_results.filters.search_responses")}
        filters={[resultFilter]}
        filterValues={{ result }}
        onFilterChange={(_, value) => setResult(value ?? "all")}
        trailing={trailing}
      />
      <QuizResultsDataTable
        columns={columns}
        data={table.rows}
        getRowId={(row) =>
          `${row.student_id}-${row.attempt_number}-${row.question_id}`
        }
        emptyState={t("teacher_quiz_results.reports.responses.empty")}
        bordered={false}
        containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card"
        manualPagination
        manualSorting
        rowCount={table.total}
        page={table.page}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
        sort={table.sort}
        onSortChange={table.setSort}
        loading={table.isLoading || table.isFetching}
      />
    </div>
  );
}

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";
import { cn } from "@/lib/utils";
import type { ResponsesReportRead, ResponsesReportRow } from "@/lib/api/hooks/quizzes";

export function ResponsesReport({ report }: { report: ResponsesReportRead }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [result, setResult] = useState("all");
  const resultFilter: FilterDef = {
    id: "result",
    label: t("teacher_quiz_results.filters.result"),
    options: [
      { value: "all", label: t("teacher_quiz_results.filters.all") },
      { value: "correct", label: t("teacher_quiz_results.filters.correct") },
      { value: "incorrect", label: t("teacher_quiz_results.filters.incorrect") },
    ],
  };
  const rows = useMemo(() => report.rows.filter((row) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || `${row.prompt_text} ${row.student_answer} ${row.correct_answer} ${row.student_id}`.toLowerCase().includes(needle);
    const matchesResult = result === "all" || (result === "correct" && row.is_correct) || (result === "incorrect" && !row.is_correct);
    return matchesSearch && matchesResult;
  }), [report.rows, search, result]);
  const columns: DataTableColumn<ResponsesReportRow>[] = [
    { id: "student", header: t("teacher_quiz_results.reports.responses.student"), cell: (row) => <span className="font-mono text-xs">{row.student_id}</span> },
    { id: "question", header: t("teacher_quiz_results.reports.responses.question"), cell: (row) => <span className="block max-w-xs truncate" title={row.prompt_text}>{row.prompt_text}</span> },
    { id: "answer", header: t("teacher_quiz_results.reports.responses.their_answer"), cell: (row) => <span className="block max-w-xs truncate" title={row.student_answer}>{row.student_answer || "—"}</span> },
    { id: "correct_answer", header: t("teacher_quiz_results.reports.responses.correct_answer"), cell: (row) => <span className="block max-w-xs truncate" title={row.correct_answer}>{row.correct_answer || "—"}</span> },
    {
      id: "result",
      header: t("teacher_quiz_results.reports.responses.is_correct"),
      align: "center",
      cell: (row) => <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full", row.is_correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{row.is_correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}</span>,
    },
    { id: "points", header: t("teacher_quiz_results.reports.responses.points"), align: "right", sortable: true, sortValue: (row) => row.points_awarded, cell: (row) => <span className="tabular-nums">{Number(row.points_awarded).toFixed(2)}</span> },
  ];
  return (
    <div className="space-y-3">
      <DataTableToolbar search={search} onSearchChange={setSearch} searchPlaceholder={t("teacher_quiz_results.filters.search_responses")} filters={[resultFilter]} filterValues={{ result }} onFilterChange={(_, value) => setResult(value ?? "all")} />
      <DataTable columns={columns} data={rows} getRowId={(row) => `${row.attempt_id}-${row.question_id}`} emptyState={t("teacher_quiz_results.reports.responses.empty")} pagination pageSize={10} pageSizeOptions={[10, 25, 50]} bordered={false} containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card" />
    </div>
  );
}

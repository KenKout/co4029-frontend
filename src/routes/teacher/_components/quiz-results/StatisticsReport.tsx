import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { DataTableColumn } from "@/components/ui/data-table";
import { QuizResultsDataTable } from "./QuizResultsDataTable";
import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";
import { fmtPercentScaled as fmtPercent } from "@/lib/format/number";
import { cn } from "@/lib/utils";
import type { StatisticsReportRead, StatisticsReportRow } from "@/lib/api/hooks/quizzes";

function discriminationClass(value: number | null): string {
  if (value === null) return "text-m3-on-surface-variant";
  if (value >= 0.3) return "text-green-700";
  if (value >= 0.1) return "text-amber-600";
  return "text-red-700";
}

export function StatisticsReport({
  report,
  trailing,
}: {
  report: StatisticsReportRead;
  trailing?: ReactNode;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [quality, setQuality] = useState("all");
  const qualityFilter: FilterDef = {
    id: "quality",
    label: t("teacher_quiz_results.filters.quality"),
    options: [
      { value: "all", label: t("teacher_quiz_results.filters.all") },
      { value: "strong", label: t("teacher_quiz_results.filters.strong") },
      { value: "weak", label: t("teacher_quiz_results.filters.weak") },
      { value: "unavailable", label: t("teacher_quiz_results.filters.unavailable") },
    ],
  };
  const rows = useMemo(() => report.rows.filter((row) => {
    const matchesSearch = !search.trim() || row.prompt_text.toLowerCase().includes(search.trim().toLowerCase());
    const value = row.discrimination_index;
    const matchesQuality = quality === "all"
      || (quality === "strong" && value !== null && value >= 0.3)
      || (quality === "weak" && value !== null && value < 0.3)
      || (quality === "unavailable" && value === null);
    return matchesSearch && matchesQuality;
  }), [report.rows, search, quality]);
  const columns: DataTableColumn<StatisticsReportRow>[] = [
    { id: "question", header: t("teacher_quiz_results.reports.statistics.question"), cell: (row) => <span className="block max-w-xl truncate" title={row.prompt_text}>{row.prompt_text}</span> },
    { id: "facility", header: t("teacher_quiz_results.reports.statistics.facility"), align: "right", sortable: true, sortValue: (row) => row.facility_index ?? -1, cell: (row) => <span className="tabular-nums">{fmtPercent(row.facility_index)}</span> },
    { id: "discrimination", header: t("teacher_quiz_results.reports.statistics.discrimination"), align: "right", sortable: true, sortValue: (row) => row.discrimination_index ?? -1, cell: (row) => <span className={cn("font-semibold tabular-nums", discriminationClass(row.discrimination_index))} title={row.discrimination_note ?? undefined}>{row.discrimination_index === null ? t("teacher_quiz_results.reports.statistics.no_data") : row.discrimination_index.toFixed(2)}</span> },
  ];
  return (
    <div className="space-y-3">
      <DataTableToolbar search={search} onSearchChange={setSearch} searchPlaceholder={t("teacher_quiz_results.filters.search_questions")} filters={[qualityFilter]} filterValues={{ quality }} onFilterChange={(_, value) => setQuality(value ?? "all")} trailing={trailing} />
      <QuizResultsDataTable columns={columns} data={rows} getRowId={(row) => row.question_id} emptyState={t("teacher_quiz_results.reports.statistics.empty")} bordered={false} containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card" />
    </div>
  );
}

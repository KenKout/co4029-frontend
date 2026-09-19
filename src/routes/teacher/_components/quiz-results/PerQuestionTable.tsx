import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar, type FilterDef } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import type { QuizOptionDistribution, QuizQuestionBreakdown } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface PerQuestionTableProps {
  questions: QuizQuestionBreakdown[];
}

function correctnessColor(rate: number | null): string {
  if (rate === null) return "text-m3-on-surface-variant";
  if (rate < 0.5) return "text-red-600";
  if (rate < 0.8) return "text-amber-600";
  return "text-emerald-600";
}

function OptionBar({ option, answeredCount }: { option: QuizOptionDistribution; answeredCount: number }) {
  const { t } = useTranslation();
  const pct = answeredCount > 0 ? Math.round((option.chosen_count / answeredCount) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1">
      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold", option.is_correct ? "bg-emerald-100 text-emerald-700" : "bg-m3-surface-container text-m3-on-surface-variant")}>
        {option.option_key}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-sm", option.is_correct ? "font-medium text-m3-on-surface" : "text-m3-on-surface-variant")}>
            {option.option_text}
          </span>
          {option.is_correct && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-m3-surface-container">
          <div className={cn("h-full rounded-full", option.is_correct ? "bg-emerald-500" : "bg-m3-primary/60")} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="w-16 shrink-0 text-right text-xs tabular-nums text-m3-on-surface-variant">
        {t("teacher_quiz_results.per_question.chosen_count", { count: option.chosen_count, pct })}
      </span>
    </div>
  );
}

export function PerQuestionTable({ questions }: PerQuestionTableProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const difficultyFilter: FilterDef = {
    id: "difficulty",
    label: t("teacher_quiz_results.filters.difficulty"),
    options: [
      { value: "all", label: t("teacher_quiz_results.filters.all") },
      { value: "hard", label: t("teacher_quiz_results.filters.hard") },
      { value: "medium", label: t("teacher_quiz_results.filters.medium") },
      { value: "easy", label: t("teacher_quiz_results.filters.easy") },
      { value: "unanswered", label: t("teacher_quiz_results.filters.unanswered") },
    ],
  };
  const filtered = useMemo(() => questions.filter((question) => {
    const matchesSearch = !search.trim() || question.prompt.toLowerCase().includes(search.trim().toLowerCase());
    const rate = question.correctness_rate;
    const matchesDifficulty = difficulty === "all"
      || (difficulty === "unanswered" && rate === null)
      || (difficulty === "hard" && rate !== null && rate < 0.5)
      || (difficulty === "medium" && rate !== null && rate >= 0.5 && rate < 0.8)
      || (difficulty === "easy" && rate !== null && rate >= 0.8);
    return matchesSearch && matchesDifficulty;
  }), [questions, search, difficulty]);

  const columns: DataTableColumn<QuizQuestionBreakdown>[] = [
    {
      id: "question",
      header: t("teacher_quiz_results.per_question.col_question"),
      cell: (question) => {
        const expanded = expandedId === question.question_id;
        return (
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              {question.option_distribution.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={expanded ? t("teacher_quiz_results.actions.collapse_options") : t("teacher_quiz_results.actions.expand_options")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedId(expanded ? null : question.question_id);
                  }}
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
              <span className="min-w-0 truncate text-sm text-m3-on-surface" title={question.prompt}>{question.prompt}</span>
            </div>
            {expanded && question.option_distribution.length > 0 && (
              <div className="mt-2 space-y-1 rounded-lg bg-m3-surface-container-lowest p-2 pl-9">
                {question.option_distribution.map((option) => (
                  <OptionBar key={option.option_id} option={option} answeredCount={question.answered_count} />
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "answered",
      header: t("teacher_quiz_results.per_question.col_answered"),
      align: "right",
      sortable: true,
      sortValue: (row) => row.answered_count,
      cell: (row) => <span className="tabular-nums">{row.answered_count}</span>,
    },
    {
      id: "correct",
      header: t("teacher_quiz_results.per_question.col_correct"),
      align: "right",
      sortable: true,
      sortValue: (row) => row.correctness_rate ?? -1,
      cell: (row) => <span className={cn("font-semibold tabular-nums", correctnessColor(row.correctness_rate))}>{row.correctness_rate === null ? "—" : `${Math.round(row.correctness_rate * 100)}%`}</span>,
    },
  ];

  return (
    <div className="space-y-3">
      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("teacher_quiz_results.filters.search_questions")}
        filters={[difficultyFilter]}
        filterValues={{ difficulty }}
        onFilterChange={(_, value) => setDifficulty(value ?? "all")}
      />
      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(row) => row.question_id}
        emptyState={t("teacher_quiz_results.per_question.empty")}
        pagination
        pageSize={10}
        pageSizeOptions={[10, 25, 50]}
        bordered={false}
        containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card"
      />
    </div>
  );
}

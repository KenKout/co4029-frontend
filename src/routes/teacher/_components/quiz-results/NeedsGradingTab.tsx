import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Input } from "@/components/ui/input";
import { useGradeAnswer, useNeedsGrading, type NeedsGradingRow } from "@/lib/api/hooks/quizzes";

export function NeedsGradingTab({ quizId }: { quizId: string }) {
  const { t } = useTranslation();
  const { data: rows, isLoading } = useNeedsGrading(quizId);
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => (rows ?? []).filter((row) => {
    const needle = search.trim().toLowerCase();
    return !needle || `${row.prompt_text} ${row.answer_text} ${row.question_type}`.toLowerCase().includes(needle);
  }), [rows, search]);
  const columns: DataTableColumn<NeedsGradingRow>[] = [
    { id: "type", header: t("teacher_quiz_results.grading.col_type"), cell: (row) => <span className="rounded-md bg-m3-surface-container-low px-2 py-0.5 text-xs font-semibold">{row.question_type}</span> },
    { id: "question", header: t("teacher_quiz_results.grading.col_question"), cell: (row) => <span className="block max-w-sm truncate" title={row.prompt_text}>{row.prompt_text}</span> },
    { id: "answer", header: t("teacher_quiz_results.grading.col_answer"), cell: (row) => <span className="block max-w-sm truncate" title={row.answer_text ?? undefined}>{row.answer_text || t("teacher_quiz_results.grading.no_answer")}</span> },
    { id: "grade", header: t("teacher_quiz_results.grading.col_action"), cell: (row) => <GradeActionCell quizId={quizId} row={row} /> },
  ];
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-m3-secondary" /></div>;
  return (
    <div className="space-y-3">
      <DataTableToolbar search={search} onSearchChange={setSearch} searchPlaceholder={t("teacher_quiz_results.filters.search_grading")} />
      <DataTable columns={columns} data={filtered} getRowId={(row) => row.answer_id} emptyState={t("teacher_quiz_results.grading.empty")} pagination pageSize={10} pageSizeOptions={[10, 25, 50]} bordered={false} containerClassName="overflow-hidden rounded-xl border border-m3-outline-variant bg-card" />
    </div>
  );
}

function GradeActionCell({ quizId, row }: { quizId: string; row: NeedsGradingRow }) {
  const { t } = useTranslation();
  const grade = useGradeAnswer(quizId);
  const [score, setScore] = useState("1");
  const [feedback, setFeedback] = useState("");
  async function handleGrade() {
    const parsed = Number(score);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error(t("teacher_quiz_results.grading.invalid_score"));
      return;
    }
    try {
      await grade.mutateAsync({ answerId: row.answer_id, body: { score: parsed, feedback: feedback.trim() || null } });
      toast.success(t("teacher_quiz_results.grading.graded"));
    } catch {
      toast.error(t("teacher_quiz_results.grading.grade_failed"));
    }
  }
  return (
    <div className="flex min-w-[360px] items-end gap-2">
      <Input aria-label={t("teacher_quiz_results.grading.score_label")} type="number" min={0} step="0.25" value={score} onChange={(event) => setScore(event.target.value)} className="h-9 w-20" />
      <Input aria-label={t("teacher_quiz_results.grading.feedback_label")} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder={t("teacher_quiz_results.grading.feedback_placeholder")} className="h-9 min-w-0 flex-1" />
      <Button size="sm" className="gap-1.5" disabled={grade.isPending} onClick={() => void handleGrade()}>
        {grade.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {t("teacher_quiz_results.grading.grade_action")}
      </Button>
    </div>
  );
}

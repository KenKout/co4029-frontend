import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useGradeAnswer,
  useNeedsGrading,
  type NeedsGradingRow,
} from "@/lib/api/hooks/quizzes";

/**
 * Phase 4 — manual grading queue. Lists open-response answers (code / missed
 * short-answer / fill-blank) awaiting a human mark, with per-answer score +
 * feedback entry. Grading recomputes the attempt score + gradebook server-side.
 */
export function NeedsGradingTab({ quizId }: { quizId: string }) {
  const { t } = useTranslation();
  const { data: rows, isLoading } = useNeedsGrading(quizId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-m3-secondary" />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="text-sm text-m3-on-surface-variant py-8 text-center">
        {t("teacher_quiz_results.grading.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <GradeRow key={row.answer_id} quizId={quizId} row={row} />
      ))}
    </div>
  );
}

function GradeRow({ quizId, row }: { quizId: string; row: NeedsGradingRow }) {
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
      await grade.mutateAsync({
        answerId: row.answer_id,
        body: { score: parsed, feedback: feedback.trim() || null },
      });
      toast.success(t("teacher_quiz_results.grading.graded"));
    } catch {
      toast.error(t("teacher_quiz_results.grading.grade_failed"));
    }
  }

  return (
    <div className="rounded-xl border border-m3-outline-variant/30 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-m3-surface-container-low px-2 py-0.5 text-xs font-semibold text-m3-on-surface-variant">
          {row.question_type}
        </span>
      </div>
      <p className="text-sm font-medium text-m3-on-surface">
        {row.prompt_text}
      </p>
      <div className="rounded-lg bg-m3-surface-container-lowest p-3 text-sm text-m3-on-surface-variant whitespace-pre-wrap">
        {row.answer_text || t("teacher_quiz_results.grading.no_answer")}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs text-m3-on-surface-variant mb-1">
            {t("teacher_quiz_results.grading.score_label")}
          </span>
          <Input
            type="number"
            min={0}
            step="0.25"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-24 bg-m3-surface"
          />
        </label>
        <label className="text-sm flex-1 min-w-[200px]">
          <span className="block text-xs text-m3-on-surface-variant mb-1">
            {t("teacher_quiz_results.grading.feedback_label")}
          </span>
          <Input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t("teacher_quiz_results.grading.feedback_placeholder")}
            className="bg-m3-surface w-full"
          />
        </label>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={grade.isPending}
          onClick={() => void handleGrade()}
        >
          {grade.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {t("teacher_quiz_results.grading.grade_action")}
        </Button>
      </div>
    </div>
  );
}

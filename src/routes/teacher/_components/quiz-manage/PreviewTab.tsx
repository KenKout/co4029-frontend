import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import { PreviewQuestion } from "./PreviewQuestion";
import { Badge } from "@/components/ui/badge";
import type { PendingQuestionDelete } from "@/lib/api/hooks/quizzes";
import type { QuizAuthoring, QuizQuestionAuthoring } from "@/lib/api/types";

/**
 * Preview tab: the quiz as a student sees it.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 */
export function PreviewTab({
  quiz,
  questions,
  onEditQuestion,
  onQueueDelete,
}: {
  quiz: QuizAuthoring;
  questions: QuizQuestionAuthoring[];
  /** Jump to this question in the Questions editor tab. */
  onEditQuestion: (questionId: string) => void;
  /** Queue this question for deletion (deferred + undo). */
  onQueueDelete: (item: PendingQuestionDelete) => void;
}) {
  const { t } = useTranslation();
  // Preview mirrors the student experience: only approved questions are
  // shown, matching the backend approved-only filter on the taking/published
  // surfaces. Pending/rejected drafts never appear here.
  const approvedQuestions = questions.filter(
    (q) => q.review_status === "approved",
  );
  return (
    <div className="bg-m3-surface-container-lowest border border-m3-outline-variant/20 rounded-xl p-6 lg:p-8 space-y-6 shadow-glass">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-headline font-extrabold text-xl text-m3-on-surface">
            {t("teacher_quiz_manage.preview.title")}
          </h2>
          <p className="text-sm text-m3-on-surface-variant mt-1">
            {t("teacher_quiz_manage.preview.description", {
              title: quiz.title,
            })}
          </p>
        </div>
        <Badge className="border border-m3-outline-variant/40 bg-m3-surface-container-low text-m3-on-surface-variant rounded-full text-[11px] font-medium px-3 py-1 self-start sm:self-auto">
          {t("teacher_quiz_manage.preview.read_only")}
        </Badge>
      </div>

      {approvedQuestions.length === 0 ? (
        <div className="text-center py-16 text-m3-on-surface-variant space-y-1">
          <HelpCircle className="h-8 w-8 mx-auto text-m3-outline-variant" />
          <p className="text-base font-bold">
            {t("teacher_quiz_manage.empty.no_questions_title")}
          </p>
          <p className="text-sm">
            {t("teacher_quiz_manage.preview.empty_approved_body")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {approvedQuestions.map((question, idx) => (
            <PreviewQuestion
              key={question.id}
              index={idx}
              question={question}
              onEditQuestion={onEditQuestion}
              onQueueDelete={onQueueDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

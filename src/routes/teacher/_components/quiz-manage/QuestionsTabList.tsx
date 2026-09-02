import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";

import type { PendingQuestionDelete } from "@/lib/api/hooks/quizzes";
import type {
  CourseLearningOutcomeAuthoring,
  QuizQuestionAuthoring,
} from "@/lib/api/types";
import { QuestionCard } from "./QuestionCard";
import type { QuestionSaver } from "./question-save";

/**
 * The question list itself: the empty state, or one QuestionCard per question.
 * Extracted from QuestionsTab verbatim.
 */
export function QuestionsTabList({
  quizId,
  courseId,
  questions,
  outcomes,
  selectedIds,
  onToggleSelect,
  onQueueDelete,
  published,
  onDirtyChange,
  onUserEditChange,
  onRegisterSaver,
  resetToken,
}: {
  quizId: string;
  courseId: string;
  questions: QuizQuestionAuthoring[];
  outcomes: CourseLearningOutcomeAuthoring[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
  published: boolean;
  onDirtyChange: (questionId: string, dirty: boolean) => void;
  onUserEditChange: (questionId: string, edited: boolean) => void;
  /** Collects each card's save function for the quiz-level save bar. */
  onRegisterSaver: (questionId: string, save: QuestionSaver | null) => void;
  /** Bumped by "Discard" to reset every draft. */
  resetToken: number;
}) {
  const { t } = useTranslation();

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-m3-outline-variant/30 bg-m3-surface-container-lowest p-10 text-center space-y-3">
        <HelpCircle className="h-10 w-10 text-m3-outline-variant mx-auto" />
        <div>
          <p className="font-headline font-bold text-m3-on-surface">
            {t("teacher_quiz_manage.empty.no_questions_title")}
          </p>
          <p className="text-sm text-m3-on-surface-variant mt-1 max-w-md mx-auto">
            {t("teacher_quiz_manage.empty.no_questions_body")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          quizId={quizId}
          courseId={courseId}
          question={question}
          outcomes={outcomes}
          selected={selectedIds.has(question.id)}
          onToggleSelect={() => onToggleSelect(question.id)}
          onQueueDelete={onQueueDelete}
          published={published}
          onDirtyChange={onDirtyChange}
          onUserEditChange={onUserEditChange}
          onRegisterSaver={onRegisterSaver}
          resetToken={resetToken}
        />
      ))}
    </>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { PendingQuestionDelete } from "@/lib/api/hooks/quizzes";
import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { PreviewAnswer } from "./PreviewAnswer";
import { PreviewQuestionHeader } from "./PreviewQuestionHeader";
import { QuestionDeleteDialog } from "./QuestionDeleteDialog";
import { readCorrectAnswer } from "./helpers";

/**
 * A single read-only question in the Preview tab.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 * The per-type answer projections now live behind PreviewAnswer's
 * type→component lookup.
 */
export function PreviewQuestion({
  index,
  question,
  onEditQuestion,
  onQueueDelete,
}: {
  index: number;
  question: QuizQuestionAuthoring;
  onEditQuestion: (questionId: string) => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
}) {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const correctAnswer = readCorrectAnswer(question);

  function handleDelete() {
    const prompt = (question.prompt_text ?? "").trim();
    onQueueDelete({
      id: question.id,
      label: prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt,
    });
  }

  return (
    <div className="rounded-xl bg-m3-surface-container-low border border-m3-outline-variant/15 p-5 space-y-3">
      <PreviewQuestionHeader
        index={index}
        question={question}
        onEditQuestion={onEditQuestion}
        onRequestDelete={() => setConfirmDelete(true)}
      />

      {confirmDelete && (
        <QuestionDeleteDialog
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            handleDelete();
          }}
        />
      )}

      <PreviewAnswer question={question} correctAnswer={correctAnswer} />

      {question.explanation && (
        <div className="pl-10">
          <p className="text-xs text-m3-on-surface-variant bg-m3-surface-container rounded-xl px-3 py-2 italic">
            <span className="font-bold not-italic">
              {t("teacher_quiz_manage.editor.explanation_inline")}{" "}
            </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

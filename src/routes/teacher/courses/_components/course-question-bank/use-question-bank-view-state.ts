import { useState } from "react";

/**
 * Purely visual disclosure state for the course-level Question Bank, extracted
 * from the former 843-line course-question-bank.tsx.
 */
export interface QuestionBankViewStateController {
  expandedAnswers: Set<string>;
  toggleAnswer: (id: string) => void;
}

export function useQuestionBankViewState(): QuestionBankViewStateController {
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(
    new Set(),
  );

  function toggleAnswer(id: string) {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { expandedAnswers, toggleAnswer };
}
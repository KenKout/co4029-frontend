import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * Purely visual disclosure state for the course-level Question Bank, extracted
 * from the former 843-line course-question-bank.tsx. Two `useState` calls in
 * their original order.
 */
export interface QuestionBankViewStateController {
  helpOpen: boolean;
  setHelpOpen: Dispatch<SetStateAction<boolean>>;
  expandedAnswers: Set<string>;
  toggleAnswer: (id: string) => void;
}

export function useQuestionBankViewState(): QuestionBankViewStateController {
  // The "how to add" copy is orientation for a first visit, not something a
  // returning teacher needs occupying a permanent band above their data.
  const [helpOpen, setHelpOpen] = useState(false);
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

  return { helpOpen, setHelpOpen, expandedAnswers, toggleAnswer };
}

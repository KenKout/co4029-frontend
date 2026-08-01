/**
 * Shared types for the question-bank modal, extracted from the former 511-line
 * `question-bank-modal.tsx` so the controller hook and the filter / list /
 * footer panels agree on one prop contract.
 */
export interface QuestionBankModalProps {
  courseId: string;
  quizId: string;
  /** When provided, the modal pre-filters to this module so teachers
   *  reviewing a module-end quiz see neighbouring questions first. */
  defaultModuleId?: string;
  onClose: () => void;
}

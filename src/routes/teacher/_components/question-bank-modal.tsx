/**
 * Question bank modal — browse and import authored questions across the
 * course (T-bank, FR-bank).
 *
 * Three concerns:
 *
 * 1. Filter strip — module / lesson / type / bloom / difficulty / search
 *    + review_status toggle. Filters live in component state and feed
 *    the ``useQuestionBank`` query directly so each change re-fetches.
 *
 * 2. Result list — checkbox per row, prompt preview, badges for type +
 *    bloom + difficulty, parent quiz title. The target quiz's own
 *    questions are excluded server-side via ``exclude_quiz_id``.
 *
 * 3. Import action — single bulk POST to
 *    ``/teacher/quizzes/{quiz_id}/questions/import``. On success we
 *    invalidate the authoring cache so the parent ``QuizManage`` view
 *    immediately renders the cloned questions at the bottom.
 *
 * Modal patterns mirror :file:`quiz-manage.tsx`'s ``GenerateModal`` — a
 * single ``fixed inset-0`` overlay with a centered card, ``Escape`` /
 * backdrop click both close. No external dnd / virtualised list lib —
 * the bank list is paginated server-side (50/page) so DOM size stays
 * bounded.
 *
 * Filter state, the bank query and the importer live in
 * `./question-bank-modal/`; this file is the composition shell.
 */

import {
  BankFilterCard,
  BankSearchBar,
} from "./question-bank-modal/BankFilters";
import {
  BankModalFooter,
  BankModalHeader,
} from "./question-bank-modal/BankModalChrome";
import { BankResultList } from "./question-bank-modal/BankResultList";
import type { QuestionBankModalProps } from "./question-bank-modal/types";
import { useQuestionBankModal } from "./question-bank-modal/use-question-bank-modal";

export function QuestionBankModal(props: QuestionBankModalProps) {
  const { onClose } = props;
  const controller = useQuestionBankModal(props);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl rounded-xl bg-m3-surface p-6 shadow-xl space-y-4 my-auto max-h-[90vh] flex flex-col">
        <BankModalHeader onClose={onClose} />
        <BankSearchBar controller={controller} />
        <BankFilterCard controller={controller} />
        <BankResultList controller={controller} />
        <BankModalFooter controller={controller} onClose={onClose} />
      </div>
    </div>
  );
}

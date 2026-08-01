import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { QuestionRow } from "./QuestionRow";
import type { QuestionBankDeletionController } from "./use-question-bank-deletion";
import type { QuestionBankEditorController } from "./use-question-bank-editor";
import type { QuestionBankFiltersController } from "./use-question-bank-filters";
import type { QuestionBankViewStateController } from "./use-question-bank-view-state";

/**
 * The controller bundle every row in the bank needs. Passed whole rather than
 * flattened into scalars, so adding a row affordance does not re-thread props
 * through three components.
 */
export interface QuestionRowControllers {
  filters: QuestionBankFiltersController;
  editor: QuestionBankEditorController;
  deletion: QuestionBankDeletionController;
  view: QuestionBankViewStateController;
}

/**
 * The filtered bank as a list, extracted verbatim from the former 843-line
 * course-question-bank.tsx. The `key` still lives on the mapped list child.
 */
export function QuestionList({
  filtered,
  controllers,
}: {
  filtered: InterviewQuestionBankItemRead[];
  controllers: QuestionRowControllers;
}) {
  return (
    <ul className="space-y-2">
      {filtered.map((item, i) => (
        <QuestionRow
          key={item.id}
          item={item}
          index={i}
          controllers={controllers}
        />
      ))}
    </ul>
  );
}

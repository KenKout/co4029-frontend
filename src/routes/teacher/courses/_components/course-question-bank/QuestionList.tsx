import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { QuestionRow } from "./QuestionRow";
import { QuestionAngleGroup } from "./QuestionAngleGroup";
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
  const groups = new Map<string, InterviewQuestionBankItemRead[]>();
  for (const item of filtered) {
    const key = item.variant_group_id ? `variant:${item.variant_group_id}` : `item:${item.id}`;
    const items = groups.get(key);
    if (items) items.push(item);
    else groups.set(key, [item]);
  }

  return (
    <ul className="space-y-2">
      {[...groups.entries()].map(([key, items]) => {
        const firstIndex = filtered.findIndex((item) => item.id === items[0]?.id);
        return items[0]?.variant_group_id && items.length >= 2 ? (
          <QuestionAngleGroup
            key={key}
            items={items}
            firstIndex={firstIndex}
            controllers={controllers}
          />
        ) : (
          <QuestionRow
            key={key}
            item={items[0]}
            index={firstIndex}
            controllers={controllers}
          />
        );
      })}
    </ul>
  );
}

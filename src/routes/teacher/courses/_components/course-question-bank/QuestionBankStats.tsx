import { useTranslation } from "react-i18next";
import { Check, Layers, Library } from "lucide-react";

import { StatTile } from "./StatTile";
import type { QuestionBankDerived } from "./use-question-bank-derived";

/**
 * Stat strip — the shape of the pool at a glance. Replaces a bare
 * "{n} question(s)" line that carried no other signal. Extracted verbatim from
 * the former 843-line course-question-bank.tsx.
 */
export function QuestionBankStats({
  derived,
}: {
  derived: QuestionBankDerived;
}) {
  const { t } = useTranslation();
  const { total, allTags, withAnswer } = derived;
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <StatTile
        icon={Library}
        label={t("teacher_question_bank.stat_total")}
        value={total}
        index={0}
      />
      <StatTile
        icon={Layers}
        label={t("teacher_question_bank.stat_tags")}
        value={allTags.length}
        index={1}
      />
      <StatTile
        icon={Check}
        label={t("teacher_question_bank.stat_with_answer")}
        value={withAnswer}
        suffix={t("teacher_question_bank.stat_of_total", { total })}
        index={2}
      />
    </div>
  );
}

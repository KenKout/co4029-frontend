import { useTranslation } from "react-i18next";
import { Library, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * The bank's two empty states, extracted verbatim from the former 843-line
 * course-question-bank.tsx.
 *
 * Two distinct weights on purpose: `EmptyBankState` is "the bank is genuinely
 * empty", which gets the dashed frame and the larger medallion.
 * `EmptyFilteredState` is deliberately lighter — nothing is wrong, the filters
 * are just too narrow.
 */
export function EmptyBankState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Library}
      title={t("teacher_question_bank.empty_title")}
      description={t("teacher_question_bank.empty_body")}
      className="rounded-xl border border-dashed border-m3-outline-variant/50 bg-m3-surface-container-lowest"
    />
  );
}

export function EmptyFilteredState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Search}
      title={t("teacher_question_bank.empty_filtered")}
      className="rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest"
      cta={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onClearFilters}
        >
          <X className="h-3.5 w-3.5" />
          {t("teacher_question_bank.clear_filters")}
        </Button>
      }
    />
  );
}

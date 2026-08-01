import { useTranslation } from "react-i18next";
import { Library, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <div className="animate-[fade-in-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both] rounded-2xl border border-dashed border-m3-outline-variant/50 bg-m3-surface-container-lowest p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-m3-primary-fixed">
        <Library className="h-7 w-7 text-m3-primary" />
      </div>
      <p className="mt-4 text-base font-bold text-m3-on-surface">
        {t("teacher_question_bank.empty_title")}
      </p>
      <p className="mx-auto mt-1.5 max-w-prose text-xs leading-relaxed text-m3-on-surface-variant">
        {t("teacher_question_bank.empty_body")}
      </p>
    </div>
  );
}

export function EmptyFilteredState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="animate-[fade-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-8 text-center">
      <Search className="mx-auto h-6 w-6 text-m3-on-surface-variant/50" />
      <p className="mt-3 text-sm font-semibold text-m3-on-surface">
        {t("teacher_question_bank.empty_filtered")}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 gap-1.5"
        onClick={onClearFilters}
      >
        <X className="h-3.5 w-3.5" />
        {t("teacher_question_bank.clear_filters")}
      </Button>
    </div>
  );
}

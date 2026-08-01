import { useTranslation } from "react-i18next";
import { ClipboardList, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The bank's two empty states, extracted verbatim from the former 2.4k-line
 * question-bank.tsx.
 *
 * Two distinct weights on purpose: `EmptyBankState` is "the bank is genuinely
 * empty", which is a starting point rather than a problem, so it gets the
 * dashed frame and the larger medallion. `EmptyFilteredState` is deliberately
 * lighter.
 */
export function EmptyBankState({
  adding,
  onStartAdd,
}: {
  adding: boolean;
  onStartAdd: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="motion-safe:animate-[fade-in-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both] space-y-3 rounded-2xl border border-dashed border-m3-outline-variant/50 bg-m3-surface-container-lowest px-4 py-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft">
        <ClipboardList className="h-7 w-7 text-m3-primary" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-m3-on-surface">
          {t("teacher_interview_config.qbank.empty_title")}
        </p>
        <p className="mx-auto max-w-md text-xs text-m3-on-surface-variant leading-relaxed">
          {t("teacher_interview_config.qbank.empty_body")}
        </p>
      </div>
      {!adding && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onStartAdd}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("teacher_interview_config.questions.add_manual")}
        </Button>
      )}
    </div>
  );
}

/**
 * Deliberately lighter than the "no questions at all" state: nothing is wrong
 * here, the filters are just too narrow, and the only thing the teacher needs
 * is the way out. Solid border and a plain icon rather than the dashed
 * medallion treatment reserved for a genuinely empty bank — same two-weight
 * split as the redesigned sibling page.
 */
export function EmptyFilteredState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="motion-safe:animate-[fade-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-8 text-center">
      <Search
        className="mx-auto h-6 w-6 text-m3-on-surface-variant/50"
        aria-hidden="true"
      />
      <p className="mt-3 text-sm font-semibold text-m3-on-surface">
        {t("teacher_interview_config.qbank.empty_filtered")}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClearFilters}
        className="mt-3 gap-1.5"
      >
        <X className="h-3.5 w-3.5" />
        {t("teacher_interview_config.qbank.clear_filters")}
      </Button>
    </div>
  );
}

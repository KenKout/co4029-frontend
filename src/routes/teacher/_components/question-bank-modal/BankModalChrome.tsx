import { Loader2, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import type { QuestionBankModalController } from "./use-question-bank-modal";

export function BankModalHeader({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-3 shrink-0">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="space-y-1">
          <h2 className="font-headline font-bold text-base text-m3-on-surface">
            {t("question_bank.title")}
          </h2>
          <p className="text-sm text-m3-on-surface-variant">
            {t("question_bank.description")}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-8 w-8 shrink-0"
        title={t("common.close")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Selection tally, select-all toggle, and the cancel / import actions. */
export function BankModalFooter({
  controller,
  onClose,
}: {
  controller: QuestionBankModalController;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const {
    selected,
    rows,
    bank,
    importer,
    allVisibleSelected,
    clearSelection,
    selectAllVisible,
    handleImport,
  } = controller;
  return (
    <div className="flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xs text-m3-on-surface-variant">
          <strong className="text-m3-on-surface">{selected.size}</strong>{" "}
          {t("question_bank.selected", { count: selected.size })}
          {t("question_bank.shown", {
            count: rows.length,
            suffix: bank.hasNextPage ? "+" : "",
          })}
        </span>
        {rows.length > 0 ? (
          <Button
            variant="link"
            type="button"
            onClick={allVisibleSelected ? clearSelection : selectAllVisible}
            className="text-xs font-medium text-m3-secondary hover:underline"
          >
            {allVisibleSelected
              ? t("question_bank.clear_selection")
              : t("question_bank.select_all_visible")}
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={importer.isPending}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleImport()}
          disabled={importer.isPending || selected.size === 0}
          className="gap-2"
        >
          {importer.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          {t("question_bank.import")}{" "}
          {selected.size > 0 ? `(${selected.size})` : ""}
        </Button>
      </div>
    </div>
  );
}

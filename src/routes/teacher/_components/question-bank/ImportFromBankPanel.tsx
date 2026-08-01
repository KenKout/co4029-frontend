import { useTranslation } from "react-i18next";
import { Check, Library, Loader2, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { difficultyChipClass } from "./helpers";

/**
 * Import-from-bank picker: multi-select course bank questions to copy in.
 * Already-present questions (by prompt) are filtered out by the caller.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx.
 */
export function ImportFromBankPanel({
  items,
  selected,
  onToggle,
  busy,
  onCancel,
  onConfirm,
}: {
  items: InterviewQuestionBankItemRead[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const count = selected.size;
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Library
          className="h-4 w-4 text-primary mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_interview_config.qbank.import_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant max-w-prose">
            {t("teacher_interview_config.qbank.import_help")}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-xs text-m3-on-surface-variant">
          {t("teacher_interview_config.qbank.import_all_added")}
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {items.map((b) => {
            const isSel = selected.has(b.id);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onToggle(b.id)}
                  aria-pressed={isSel}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                    isSel
                      ? "border-primary bg-primary/10"
                      : "border-m3-outline-variant/30 bg-m3-surface hover:bg-m3-surface-container-low",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isSel
                        ? "border-primary bg-primary text-white"
                        : "border-m3-outline-variant",
                    )}
                  >
                    {isSel && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block text-sm text-m3-on-surface leading-relaxed">
                      {b.prompt_text}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {t(
                          `teacher_interview_config.qbank.type.${b.question_type}`,
                        )}
                      </Badge>
                      {b.difficulty && (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            difficultyChipClass(b.difficulty),
                          )}
                        >
                          {t(
                            `teacher_interview_config.qbank.difficulty.${b.difficulty}`,
                          )}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={busy || count === 0}
          onClick={onConfirm}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t("teacher_interview_config.qbank.import_selected", { count })}
        </Button>
      </div>
    </div>
  );
}

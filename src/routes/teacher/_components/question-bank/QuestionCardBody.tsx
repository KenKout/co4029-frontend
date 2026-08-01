import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuestionCardProps } from "./types";

/**
 * Expanded / editing body of a question card — slides open/closed via a
 * grid-rows transition (0fr → 1fr) so "View answer"/"Hide answer" animates up
 * and down instead of snapping.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx.
 */
export function QuestionCardBody({
  q,
  expanded,
  editing,
  editingText,
  editingAnswer,
  saving,
  onCancelEdit,
  onSaveEdit,
  onChangeEditingText,
  onChangeEditingAnswer,
}: Pick<
  QuestionCardProps,
  | "q"
  | "expanded"
  | "editing"
  | "editingText"
  | "editingAnswer"
  | "saving"
  | "onCancelEdit"
  | "onSaveEdit"
  | "onChangeEditingText"
  | "onChangeEditingAnswer"
>) {
  const { t } = useTranslation();
  return (
    <div
      id={`qbank-body-${q.id}`}
      className={cn(
        "grid transition-all duration-300 ease-out motion-reduce:transition-none",
        expanded || editing
          ? "grid-rows-[1fr] opacity-100"
          : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <div className="px-3 pb-3 pl-11 space-y-2 border-t border-m3-outline-variant/10 pt-3">
          {editing ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
                  {t("teacher_interview_config.qbank.edit_question")}
                </label>
                <textarea
                  value={editingText}
                  onChange={(e) => onChangeEditingText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary/80">
                  {t("teacher_interview_config.questions.model_answer_label")}
                </label>
                <textarea
                  value={editingAnswer}
                  onChange={(e) => onChangeEditingAnswer(e.target.value)}
                  rows={4}
                  placeholder={t(
                    "teacher_interview_config.questions.add_answer_placeholder",
                  )}
                  className="w-full rounded-xl border border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] px-3 py-2 text-sm placeholder:text-m3-on-surface-variant/40 resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancelEdit}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !editingText.trim()}
                  onClick={onSaveEdit}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {t("common.save")}
                </Button>
              </div>
            </>
          ) : q.model_answer ? (
            <div className="rounded-lg border border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03] p-2.5 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary/80">
                {t("teacher_interview_config.questions.model_answer_label")}
              </p>
              <p className="text-sm text-m3-on-surface-variant whitespace-pre-wrap leading-relaxed">
                {q.model_answer}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-m3-on-surface-variant/60 italic">
              {t("teacher_interview_config.questions.model_answer_missing")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

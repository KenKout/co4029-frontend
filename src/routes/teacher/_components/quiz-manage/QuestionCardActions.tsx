import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Copy,
  Library,
  Loader2,
  MoreVertical,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { QuizQuestionAuthoring } from "@/lib/api/types";
import type { QuestionSaver } from "./question-save";

/**
 * Per-question actions, as a header control rather than a footer row.
 *
 * This was a row of up to six equal-weight buttons (Save, Approve, Regenerate,
 * Duplicate, Add to bank, Delete) at the bottom of every card. Two things were
 * wrong with it: Save is no longer per-card — the quiz-level save bar owns
 * that, so twenty questions no longer mean twenty separate saves — and the
 * remaining five are all things a teacher does occasionally to ONE question,
 * which is what a menu is for. As a row they cost 32px on every card and made
 * five competing calls to action out of what is really "…".
 *
 * Approve stays outside the menu when it applies: it is the review gesture the
 * whole Questions tab exists to collect, and burying the only affirmative
 * action behind a menu would make approving a generated quiz a 3-click job per
 * question.
 */
export function QuestionCardActions({
  question,
  savePending,
  regeneratePending,
  duplicatePending,
  addToBankPending,
  onSave,
  onRegenerate,
  onDuplicate,
  onRequestAddToBank,
  onRequestDelete,
}: {
  question: QuizQuestionAuthoring;
  savePending: boolean;
  regeneratePending: boolean;
  duplicatePending: boolean;
  addToBankPending: boolean;
  onSave: QuestionSaver;
  onRegenerate: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onRequestAddToBank: () => void;
  onRequestDelete: () => void;
}) {
  const { t } = useTranslation();
  const busy = regeneratePending || duplicatePending || addToBankPending;

  return (
    <div className="flex items-center gap-1.5">
      {question.review_status !== "approved" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onSave("approved")}
          disabled={savePending}
          className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
        >
          {savePending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {t("teacher_quiz_manage.editor.approve")}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          aria-label={t(
            "teacher_quiz_manage.editor.more_actions",
            "More actions for this question",
          )}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-m3-outline-variant/40 text-m3-on-surface-variant outline-none transition-colors hover:bg-m3-primary/8 hover:text-m3-primary cursor-pointer"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MoreVertical className="h-3.5 w-3.5" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => void onRegenerate()}
            disabled={regeneratePending}
            className="cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            {t("teacher_quiz_manage.editor.regenerate")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void onDuplicate()}
            disabled={duplicatePending}
            className="cursor-pointer"
          >
            <Copy className="h-4 w-4" />
            {t("teacher_quiz_manage.editor.duplicate", "Duplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onRequestAddToBank}
            disabled={addToBankPending}
            className="cursor-pointer"
          >
            <Library className="h-4 w-4" />
            {t("teacher_quiz_manage.editor.add_to_bank", "Add to bank")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={onRequestDelete}
            className="cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

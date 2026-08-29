import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  Check,
  ChevronDown,
  Loader2,
  MoreVertical,
  Pencil,
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
import { StatusControl } from "./StatusControl";
import type { QuestionCardProps } from "./types";

/**
 * Right-side controls of a question card: the unified status dropdown plus the
 * edit button and the overflow action menu (edit, view answer, move to
 * top/bottom, add to bank, practice partition, delete).
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx.
 */
export function QuestionCardActions({
  q,
  index,
  total,
  expanded,
  editing,
  saving,
  reordering,
  isPublished,
  banking,
  alreadyInBank,
  onSetStatus,
  onToggleExpand,
  onBeginEdit,
  onDelete,
  onMoveToTop,
  onMoveToBottom,
  onAddToBank,
}: Pick<
  QuestionCardProps,
  | "q"
  | "index"
  | "total"
  | "expanded"
  | "editing"
  | "saving"
  | "reordering"
  | "isPublished"
  | "banking"
  | "alreadyInBank"
  | "onSetStatus"
  | "onToggleExpand"
  | "onBeginEdit"
  | "onDelete"
  | "onMoveToTop"
  | "onMoveToBottom"
  | "onAddToBank"
>) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1 shrink-0">
      <StatusControl
        status={q.review_status}
        saving={saving}
        disabled={isPublished}
        onSetStatus={onSetStatus}
      />
      {!editing && !isPublished && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBeginEdit}
            className="gap-1.5 hidden sm:inline-flex"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("common.edit")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("teacher_interview_config.qbank.more_actions")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-surface-muted hover:text-m3-on-surface cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={onBeginEdit}
                className="sm:hidden gap-2"
              >
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleExpand} className="gap-2">
                <ChevronDown className="h-4 w-4" />
                {expanded
                  ? t("teacher_interview_config.qbank.hide_answer")
                  : t("teacher_interview_config.qbank.view_answer")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onMoveToTop}
                disabled={reordering || index === 0}
                className="gap-2"
              >
                <ArrowUp className="h-4 w-4" />
                {t("teacher_interview_config.qbank.move_to_top")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onMoveToBottom}
                disabled={reordering || index === total - 1}
                className="gap-2"
              >
                <ArrowDown className="h-4 w-4" />
                {t("teacher_interview_config.qbank.move_to_bottom")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onAddToBank}
                disabled={banking || alreadyInBank}
                className="gap-2"
              >
                {banking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : alreadyInBank ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <BookMarked className="h-4 w-4" />
                )}
                {alreadyInBank
                  ? t("teacher_interview_config.qbank.already_in_bank")
                  : t("teacher_interview_config.qbank.add_to_bank")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="gap-2 text-red-700 focus:text-red-700 focus:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

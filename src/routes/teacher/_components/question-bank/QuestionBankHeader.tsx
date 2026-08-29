import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronDown,
  Library,
  Loader2,
  Plus,
  Rows2,
  Rows3,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Sticky toolbar header of the Question Bank: title + module badge + count
 * line on the left, the action cluster (density, collapse all, approve all,
 * import from bank, add manual) on the right.
 *
 * Extracted verbatim from the former 2.4k-line question-bank.tsx.
 */
export interface QuestionBankHeaderProps {
  isPublished: boolean;
  moduleTitle?: string | null;
  anyFilterActive: boolean;
  filteredCount: number;
  totalCount: number;
  approvedCount: number;
  hasQuestions: boolean;
  compact: boolean;
  onToggleCompact: () => void;
  expandedCount: number;
  onCollapseAll: () => void;
  pendingCount: number;
  approvingAll: boolean;
  updatePending: boolean;
  onApproveAll: () => void;
  adding: boolean;
  importing: boolean;
  bankItemCount: number;
  onStartImport: () => void;
  onStartAdd: () => void;
}

export function QuestionBankHeader(props: QuestionBankHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <HeaderTitle
        moduleTitle={props.moduleTitle}
        anyFilterActive={props.anyFilterActive}
        filteredCount={props.filteredCount}
        totalCount={props.totalCount}
        approvedCount={props.approvedCount}
      />
      <HeaderActions
        isPublished={props.isPublished}
        hasQuestions={props.hasQuestions}
        compact={props.compact}
        onToggleCompact={props.onToggleCompact}
        expandedCount={props.expandedCount}
        onCollapseAll={props.onCollapseAll}
        pendingCount={props.pendingCount}
        approvingAll={props.approvingAll}
        updatePending={props.updatePending}
        onApproveAll={props.onApproveAll}
        adding={props.adding}
        importing={props.importing}
        bankItemCount={props.bankItemCount}
        onStartImport={props.onStartImport}
        onStartAdd={props.onStartAdd}
      />
    </div>
  );
}

function HeaderTitle({
  moduleTitle,
  anyFilterActive,
  filteredCount,
  totalCount,
  approvedCount,
}: Pick<
  QuestionBankHeaderProps,
  | "moduleTitle"
  | "anyFilterActive"
  | "filteredCount"
  | "totalCount"
  | "approvedCount"
>) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-headline font-extrabold text-base text-m3-on-surface">
          {t("teacher_interview_config.questions.list_title")}
        </h3>
        {moduleTitle && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-m3-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-m3-secondary"
            title={t("teacher_interview_config.qbank.module_badge_tooltip")}
          >
            <Library className="h-3 w-3" />
            {moduleTitle}
          </span>
        )}
      </div>
      <p className="text-xs text-m3-on-surface-variant mt-0.5">
        {anyFilterActive
          ? t("teacher_interview_config.qbank.showing_filtered", {
              shown: filteredCount,
              total: totalCount,
            })
          : t("teacher_interview_config.qbank.showing_all", {
              count: totalCount,
              approved: approvedCount,
            })}
      </p>
    </div>
  );
}

function HeaderActions({
  isPublished,
  hasQuestions,
  compact,
  onToggleCompact,
  expandedCount,
  onCollapseAll,
  pendingCount,
  approvingAll,
  updatePending,
  onApproveAll,
  adding,
  importing,
  bankItemCount,
  onStartImport,
  onStartAdd,
}: Omit<
  QuestionBankHeaderProps,
  | "moduleTitle"
  | "anyFilterActive"
  | "filteredCount"
  | "totalCount"
  | "approvedCount"
>) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {hasQuestions && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleCompact}
          aria-pressed={compact}
          title={t(
            compact
              ? "teacher_interview_config.qbank.density_comfortable"
              : "teacher_interview_config.qbank.density_compact",
          )}
          className="gap-1.5 text-xs"
        >
          {compact ? (
            <Rows2 className="h-3.5 w-3.5" />
          ) : (
            <Rows3 className="h-3.5 w-3.5" />
          )}
          {t(
            compact
              ? "teacher_interview_config.qbank.density_comfortable"
              : "teacher_interview_config.qbank.density_compact",
          )}
        </Button>
      )}
      {expandedCount > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCollapseAll}
          className="gap-1.5 text-xs"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          {t("teacher_interview_config.qbank.collapse_all")}
        </Button>
      )}
      {pendingCount > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPublished || approvingAll || updatePending}
          onClick={onApproveAll}
          className="gap-1.5 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
        >
          {approvingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          {t("teacher_interview_config.questions.approve_all", {
            count: pendingCount,
          })}
        </Button>
      )}
      {!isPublished && !adding && !importing && bankItemCount > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onStartImport}
          className="gap-1.5 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
        >
          <Library className="h-3.5 w-3.5" />
          {t("teacher_interview_config.qbank.import_from_bank")}
        </Button>
      )}
      {!isPublished && !adding && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onStartAdd}
          className="gap-1.5 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("teacher_interview_config.questions.add_manual")}
        </Button>
      )}
    </div>
  );
}

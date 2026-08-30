import { useEffect, useId, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Library, Loader2 } from "lucide-react";
import type { InterviewQuestionAuthoring } from "@/lib/api/types";
import type { TranslateFn } from "./types";

const ANGLE_ORDER = [
  "technical",
  "system_design",
  "situational",
  "behavioral",
] as const;

function angleOrder(question: InterviewQuestionAuthoring) {
  const index = ANGLE_ORDER.indexOf(
    question.question_type as (typeof ANGLE_ORDER)[number],
  );
  return index === -1 ? ANGLE_ORDER.length : index;
}

interface QuestionAngleGroupProps {
  questions: InterviewQuestionAuthoring[];
  renderCard: (question: InterviewQuestionAuthoring) => ReactNode;
  t: TranslateFn;
  onApproveAll: (questions: InterviewQuestionAuthoring[]) => void;
  approvingGroupId: string | null;
  onAddAllToBank: (questions: InterviewQuestionAuthoring[]) => void;
  bankingGroupId: string | null;
  groupAlreadyBanked: boolean;
  isPublished: boolean;
}

/** One logical problem with one selectable child card per available angle. */
export function QuestionAngleGroup({
  questions,
  renderCard,
  t,
  onApproveAll,
  approvingGroupId,
  onAddAllToBank,
  bankingGroupId,
  groupAlreadyBanked,
  isPublished,
}: QuestionAngleGroupProps) {
  const ordered = useMemo(
    () =>
      [...questions].sort(
        (a, b) =>
          angleOrder(a) - angleOrder(b) ||
          (a.position ?? 0) - (b.position ?? 0),
      ),
    [questions],
  );
  const [activeId, setActiveId] = useState(ordered[0]?.id ?? "");
  const idPrefix = useId();
  const active =
    ordered.find((question) => question.id === activeId) ?? ordered[0];

  useEffect(() => {
    if (active && active.id !== activeId) setActiveId(active.id);
  }, [active, activeId]);

  if (!active) return null;

  return (
    <li className="rounded-xl border border-m3-primary/25 bg-m3-surface-container-low p-2 sm:p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <h4 className="text-xs font-bold uppercase tracking-wide text-m3-primary">
          {t("teacher_interview_config.qbank.logical_question")}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-m3-on-surface-variant">
            {t("teacher_interview_config.qbank.angle_count", {
              count: ordered.length,
            })}
          </span>
          {ordered.some((question) => question.review_status !== "approved") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPublished || !!approvingGroupId}
              onClick={() => onApproveAll(ordered)}
              className="h-7 gap-1 px-2 text-[11px]"
            >
              {approvingGroupId === (ordered[0].variant_group_id ?? ordered[0].id) ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {t("teacher_interview_config.qbank.approve_logical_question")}
            </Button>
          )}
          {ordered.length === 4 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPublished || groupAlreadyBanked || !!bankingGroupId}
              onClick={() => onAddAllToBank(ordered)}
              className="h-7 gap-1 px-2 text-[11px]"
            >
              {bankingGroupId === ordered[0].variant_group_id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Library className="h-3 w-3" />
              )}
              {groupAlreadyBanked
                ? t("teacher_interview_config.qbank.logical_group_already_banked")
                : t("teacher_interview_config.qbank.add_logical_group_to_bank")}
            </Button>
          )}
        </div>
      </div>
      <div
        role="tablist"
        aria-label={t("teacher_interview_config.qbank.angle_tabs_label")}
        className="mb-2 flex flex-wrap gap-1 border-b border-m3-outline-variant/30 px-1"
      >
        {ordered.map((question) => {
          const selected = question.id === active.id;
          const tabId = `${idPrefix}-tab-${question.id}`;
          const panelId = `${idPrefix}-panel-${question.id}`;
          return (
            <Button
              key={question.id}
              id={tabId}
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(question.id)}
              className={
                selected
                  ? "rounded-t-md border-b-2 border-m3-primary bg-m3-primary-fixed px-2.5 py-1.5 text-xs font-bold text-m3-primary"
                  : "rounded-t-md px-2.5 py-1.5 text-xs font-medium text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"
              }
            >
              {t(
                `teacher_interview_config.qbank.type.${question.question_type}`,
              )}
            </Button>
          );
        })}
      </div>
      <div
        id={`${idPrefix}-panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`${idPrefix}-tab-${active.id}`}
      >
        <ul role="list">{renderCard(active)}</ul>
      </div>
    </li>
  );
}

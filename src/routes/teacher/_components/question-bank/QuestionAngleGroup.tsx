import { useEffect, useId, useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
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
}

/** One logical problem with one selectable child card per available angle. */
export function QuestionAngleGroup({
  questions,
  renderCard,
  t,
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
        <span className="text-xs text-m3-on-surface-variant">
          {t("teacher_interview_config.qbank.angle_count", {
            count: ordered.length,
          })}
        </span>
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

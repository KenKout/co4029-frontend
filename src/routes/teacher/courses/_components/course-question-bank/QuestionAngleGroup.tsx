import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Trash2 } from "lucide-react";

import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { QuestionRow } from "./QuestionRow";
import type { QuestionRowControllers } from "./QuestionList";

const ANGLE_ORDER = [
  "technical",
  "system_design",
  "situational",
  "behavioral",
] as const;

function order(item: InterviewQuestionBankItemRead) {
  const index = ANGLE_ORDER.indexOf(item.question_type as (typeof ANGLE_ORDER)[number]);
  return index === -1 ? ANGLE_ORDER.length : index;
}

/** A two-to-four angle logical problem in the course question bank. */
export function QuestionAngleGroup({
  items,
  firstIndex,
  controllers,
}: {
  items: InterviewQuestionBankItemRead[];
  firstIndex: number;
  controllers: QuestionRowControllers;
}) {
  const { t } = useTranslation();
  const { deletion } = controllers;
  const ordered = useMemo(
    () => [...items].sort((a, b) => order(a) - order(b) || a.created_at.localeCompare(b.created_at)),
    [items],
  );
  const [activeId, setActiveId] = useState(ordered[0]?.id ?? "");
  const active = ordered.find((item) => item.id === activeId) ?? ordered[0];
  if (!active) return null;

  // A row's own delete removes one angle, which would silently leave the
  // logical question incomplete. This is the group-scoped escape hatch.
  const busy = ordered.some((item) => deletion.deletingIds.has(item.id));

  return (
    <li className="rounded-xl border border-m3-primary/25 bg-m3-surface-container-low p-2 sm:p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <h4 className="text-xs font-bold uppercase tracking-wide text-m3-primary">
          {t("teacher_interview_config.qbank.logical_question")}
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-m3-on-surface-variant">
            {t("teacher_interview_config.qbank.angle_count", { count: ordered.length })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => deletion.setConfirmDeleteGroup(ordered)}
            className="h-7 gap-1 px-2 text-[11px] text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            {t("teacher_question_bank.delete_group")}
          </Button>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-1 border-b border-m3-outline-variant/30 px-1" role="tablist" aria-label={t("teacher_interview_config.qbank.angle_tabs_label")}>
        {ordered.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            role="tab"
            aria-selected={item.id === active.id}
            onClick={() => setActiveId(item.id)}
            className={item.id === active.id
              ? "rounded-t-md border-b-2 border-m3-primary bg-m3-primary-fixed px-2.5 py-1.5 text-xs font-bold text-m3-primary"
              : "rounded-t-md px-2.5 py-1.5 text-xs font-medium text-m3-on-surface-variant hover:bg-m3-surface-container-high hover:text-m3-primary"}
          >
            {t(`teacher_interview_config.qbank.type.${item.question_type}`)}
          </Button>
        ))}
      </div>
      <ul role="list">
        <QuestionRow item={active} index={firstIndex + ordered.indexOf(active)} controllers={controllers} />
      </ul>
    </li>
  );
}

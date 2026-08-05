import { MoreVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InterviewOutcomeAuthoring } from "@/lib/api/types";

import { CoverageChip, Dot } from "./CoverageChip";
import { coverageOf } from "./helpers";
import type { TranslateFn } from "./types";
import { WeightStepper } from "./WeightStepper";

function OutcomeRowActions({
  onViewQuestions,
  onRequestDelete,
  disabled,
  disabledReason,
  t,
}: {
  onViewQuestions: () => void;
  onRequestDelete: () => void;
  disabled?: boolean;
  disabledReason?: string;
  t: TranslateFn;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onViewQuestions}
        className="gap-1.5 hidden sm:inline-flex text-xs"
      >
        {t("teacher_interview_config.outcomes.view_questions")}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("teacher_interview_config.qbank.more_actions")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-m3-on-surface-variant hover:bg-surface-muted hover:text-m3-on-surface cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={onViewQuestions}
            className="gap-2 sm:hidden"
          >
            {t("teacher_interview_config.outcomes.view_questions")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onRequestDelete}
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
            className="gap-2 text-red-700 focus:text-red-700 focus:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            {t("teacher_interview_config.outcomes.remove")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export interface OutcomeRowHandlers {
  onViewQuestions: (outcomeId: string) => void;
  onRequestDelete: (outcome: InterviewOutcomeAuthoring) => void;
  onChangeWeight: (outcome: InterviewOutcomeAuthoring, next: number) => void;
}

/** One outcome row: index badge, statement, coverage meta, weight, actions. */
export function OutcomeRow({
  outcome,
  index,
  questionCount,
  saving,
  disabled,
  disabledReason,
  handlers,
  t,
}: {
  outcome: InterviewOutcomeAuthoring;
  index: number;
  questionCount: number;
  saving: boolean;
  /** Published configs freeze the outcomes (they are the grading criteria). */
  disabled?: boolean;
  disabledReason?: string;
  handlers: OutcomeRowHandlers;
  t: TranslateFn;
}) {
  return (
    <li
      // Staggered enter so a freshly added outcome arrives with a beat
      // rather than snapping into the list. Capped at 8 steps so a long
      // outcome list is fully readable in ~320ms.
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      className="group animate-[fade-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low overflow-hidden transition-colors hover:border-m3-primary/30"
    >
      <div className="flex items-start gap-2.5 p-3">
        {/* Index badge only — outcomes mirror the course order, so
            there is no per-row reordering here. */}
        <span
          className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-m3-primary-fixed px-2 py-0.5 text-[11px] font-extrabold text-m3-primary"
          aria-hidden="true"
        >
          LO{index + 1}
        </span>

        {/* Statement + metadata (read-only: the text is owned by the
            course-level outcome and imported, never edited here). */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm text-m3-on-surface leading-relaxed">
            {outcome.outcome_text}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-m3-on-surface-variant">
            <CoverageChip
              coverage={coverageOf(questionCount)}
              count={questionCount}
            />
            <Dot />
            <span>
              {t(
                `teacher_interview_config.outcomes.type_${outcome.outcome_type}`,
              )}
            </span>
          </div>
        </div>

        {/* Weight stepper — the one inline-editable knob, saved
            immediately (no edit mode / no save button). Frozen on a
            published config: reweighting changes how every answer scores. */}
        <WeightStepper
          weight={outcome.importance_weight}
          busy={saving}
          disabled={disabled}
          disabledReason={disabledReason}
          onChange={(next) => handlers.onChangeWeight(outcome, next)}
        />

        <OutcomeRowActions
          onViewQuestions={() => handlers.onViewQuestions(outcome.id)}
          onRequestDelete={() => handlers.onRequestDelete(outcome)}
          disabled={disabled}
          disabledReason={disabledReason}
          t={t}
        />
      </div>
    </li>
  );
}

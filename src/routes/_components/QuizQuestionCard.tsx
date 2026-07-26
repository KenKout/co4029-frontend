import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flag, Sparkles, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RichContent } from "@/components/ui/rich-content";
import type { QuizQuestionPublic } from "@/lib/api/types";
import { QuestionRenderer } from "./QuestionRenderer";

export interface QuestionStatus {
  selectedOptionId: string | null;
  answerText: string | null;
  flagged: boolean;
  hintViewed: boolean;
  savedToServer: boolean;
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * One question card in the taking view.
 *
 * Extracted so the page can render N of them (pagination: 1 / 5 / 10 / All)
 * instead of a single hard-coded "active question" block.
 *
 * `registerRef` wires the card into the per-question focus-time observer — the
 * card must own that ref because attention is measured per element, and with
 * several cards on screen the page can't know which one holds the student's
 * attention.
 *
 * The per-question timer badge polls `peekFocusMs` on an interval rather than
 * receiving a prop, so N mounted cards don't force a page-level re-render every
 * second.
 */
export function QuizQuestionCard({
  question,
  index,
  total,
  status,
  isActive,
  disabled,
  showHints,
  hintText,
  cooldownRetryAt,
  registerRef,
  peekFocusMs,
  onFocusQuestion,
  onSelectOption,
  onAnswerTextChange,
  onToggleFlag,
  onShowHint,
}: {
  question: QuizQuestionPublic;
  index: number;
  total: number;
  status: QuestionStatus;
  /** Highlighted as the question the student is currently on. */
  isActive: boolean;
  disabled: boolean;
  showHints: boolean;
  hintText: string | null;
  cooldownRetryAt: string | null;
  registerRef: (node: HTMLElement | null) => void;
  peekFocusMs: () => number;
  onFocusQuestion: () => void;
  onSelectOption: (optionId: string) => void;
  onAnswerTextChange: (value: string | null) => void;
  onToggleFlag: () => void;
  onShowHint: () => void;
}) {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);

  // Poll the accumulated focus time for this card's badge. Cheap (a ref read)
  // and scoped to this component, so it never re-renders siblings.
  useEffect(() => {
    const tick = () => setElapsed(Math.floor(peekFocusMs() / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [peekFocusMs]);

  return (
    <div
      ref={registerRef}
      id={`quiz-question-${question.id}`}
      onFocusCapture={onFocusQuestion}
      onPointerDown={onFocusQuestion}
      className={cn(
        "bg-m3-surface-container-lowest rounded-xl p-6 sm:p-10 relative overflow-hidden shadow-editorial scroll-mt-32",
        "transition-shadow",
        isActive && total > 1 && "ring-2 ring-m3-secondary/40",
      )}
    >
      <div className="absolute top-0 right-0 m-5 flex items-center gap-2">
        <Badge
          variant="outline"
          className="text-m3-outline border-m3-outline-variant font-mono text-[10px] bg-white"
        >
          <Timer className="h-3 w-3 mr-1" />
          {formatTime(elapsed)}
        </Badge>
        {isActive && (
          <Badge className="bg-m3-secondary-fixed text-m3-on-surface border-0 font-bold text-[10px] px-3 py-1.5 gap-1.5 rounded-full">
            <Sparkles className="h-3 w-3" />
            {t("course_quiz.status.currently_doing")}
          </Badge>
        )}
        {status.savedToServer && (
          <Badge className="bg-emerald-50 text-emerald-700 border-0 font-bold text-[10px] px-2.5 py-1.5 rounded-full">
            {t("course_quiz.status.saved")}
          </Badge>
        )}
      </div>

      <div className="mb-8 pt-2">
        <span className="text-m3-secondary font-headline font-bold text-xs tracking-widest uppercase mb-3 block">
          {t("course_quiz.labels.question_label_short", {
            index: String(index + 1).padStart(2, "0"),
          })}
        </span>
        <h2 className="text-xl sm:text-2xl font-headline font-bold text-m3-on-surface leading-snug">
          <RichContent
            value={question.prompt_text}
            format={question.prompt_format ?? "plain"}
          />
        </h2>
      </div>

      <QuestionRenderer
        question={question}
        selectedOptionId={status.selectedOptionId}
        answerText={status.answerText}
        disabled={disabled}
        onSelectOption={onSelectOption}
        onAnswerTextChange={onAnswerTextChange}
      />

      {cooldownRetryAt && (
        <p className="mt-4 text-xs font-semibold text-amber-700">
          {t("course_quiz.errors.cooldown_active")}
        </p>
      )}

      {/* Per-question actions. In multi-question layouts these must live on the
          card, not in a single page-level bar, or they'd act on the wrong
          question. */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          onClick={onToggleFlag}
          disabled={disabled}
          className={cn(
            "font-bold rounded-xl gap-2 text-sm",
            status.flagged
              ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
              : "text-m3-outline hover:text-m3-on-surface",
          )}
        >
          <Flag className="h-4 w-4" />
          {status.flagged
            ? t("course_quiz.actions.unflag")
            : t("course_quiz.actions.flag")}
        </Button>

        {showHints && hintText && (
          <Button
            variant="ghost"
            onClick={onShowHint}
            disabled={disabled}
            className="font-bold rounded-xl gap-2 text-sm text-m3-primary hover:bg-m3-primary-fixed/30"
          >
            {status.hintViewed
              ? t("course_quiz.actions.view_hint_again")
              : t("course_quiz.actions.show_hint")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default QuizQuestionCard;

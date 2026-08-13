import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ArrowUpDown,
  Award,
  Check,
  Lightbulb,
  Target,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { RichContent } from "@/components/ui/rich-content";
import type {
  QuizAttemptReviewOption,
  QuizAttemptReviewQuestion,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * One answer option in the review. Only the meaningful options get visual
 * weight: the student's pick is CIRCLEd around the letter (red ring when
 * wrong, green when right) and the correct answer always gets a green
 * background; the rest render as plain neutral rows when revealed.
 */
function ReviewOptionRow({
  option,
  mark,
  selected,
}: {
  option: QuizAttemptReviewOption;
  /** "wrong" = the student's incorrect pick, "correct" = the right answer. */
  mark: "correct" | "wrong" | null;
  /** Whether this is the option the student picked (drives the ring). */
  selected: boolean;
}) {
  let rowCls = "bg-m3-surface-container-low border-m3-outline-variant/20";
  let letterCls = "text-m3-on-surface-variant";

  if (mark === "wrong") {
    rowCls = "bg-red-500/10 border-red-400";
    letterCls = "bg-red-100 text-red-700 ring-2 ring-red-500";
  } else if (mark === "correct") {
    rowCls = "bg-emerald-500/10 border-emerald-400/70";
    letterCls = selected
      ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500"
      : "text-emerald-700";
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 flex items-center gap-2.5 text-sm",
        rowCls,
      )}
    >
      <span
        className={cn(
          "w-7 h-7 shrink-0 flex items-center justify-center rounded-full font-bold text-xs",
          letterCls,
        )}
      >
        {option.option_key}
      </span>
      <span className="flex-1 text-m3-on-surface leading-snug">
        {option.option_text}
      </span>
    </div>
  );
}

/** Prompt header — no verdict badge (the card outline carries it). */
function QuestionHeader({
  question,
  index,
}: {
  question: QuizAttemptReviewQuestion;
  index: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xs font-headline font-black text-m3-secondary tabular-nums shrink-0">
          Q{index + 1}
        </span>
        <div className="text-sm font-semibold text-m3-on-surface flex-1 min-w-0">
          <RichContent
            value={question.prompt_text}
            format={
              (question as { prompt_format?: string | null }).prompt_format ??
              "plain"
            }
            inline
          />
        </div>
      </div>
    </div>
  );
}

/** Points, attention time and hint usage. */
function QuestionMetaRow({
  question,
}: {
  question: QuizAttemptReviewQuestion;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4 text-[10px] text-m3-on-surface-variant pt-2 border-t border-m3-outline-variant/15">
      <span className="inline-flex items-center gap-1">
        <Award className="h-3 w-3" />
        {t("course_quiz_review.points", {
          n: Number(question.points_awarded ?? 0).toFixed(1),
        })}
      </span>
      {question.t_actual_ms != null && (
        <span className="inline-flex items-center gap-1">
          <Target className="h-3 w-3" />
          {(question.t_actual_ms / 1000).toFixed(1)}s
        </span>
      )}
      {question.hint_used && (
        <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
          <Lightbulb className="h-3 w-3" />
          {t("course_quiz_review.hint_used")}
        </span>
      )}
    </div>
  );
}

/** One matching pair in the review: student answer + correct answer. */
function MatchingPairRow({
  left,
  studentRight,
  correctRight,
}: {
  left: string;
  studentRight: string | null;
  correctRight: string;
}) {
  const { t } = useTranslation();
  const answered = studentRight != null;
  const isRight =
    answered &&
    studentRight.trim().toLowerCase() === correctRight.trim().toLowerCase();

  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-3 py-2.5">
      <p className="text-sm font-semibold text-m3-on-surface">{left}</p>
      <div className="mt-1.5 flex items-center gap-2 text-sm flex-wrap">
        {answered ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              isRight ? "text-emerald-600" : "text-red-600",
            )}
          >
            {isRight ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {studentRight}
          </span>
        ) : (
          <span className="text-xs italic text-m3-on-surface-variant">
            {t("course_quiz_review.not_answered")}
          </span>
        )}
        {!isRight && (
          <>
            <ArrowRight className="h-4 w-4 text-m3-outline shrink-0" />
            <span className="font-semibold text-emerald-600">
              {correctRight}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** Parse the student's matching submission ({left: chosen_right}). */
function parseMatchingAnswer(
  answerText: string | null | undefined,
): Record<string, string> {
  if (!answerText) return {};
  try {
    const data = JSON.parse(answerText);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return Object.fromEntries(
        Object.entries(data as Record<string, unknown>).map(([k, v]) => [
          k,
          toStr(v),
        ]),
      );
    }
  } catch {
    // fall through
  }
  return {};
}

/** Stringify a JSON scalar safely (never "[object Object]"). */
function toStr(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

/** The authored [{left, right}] pairs for a matching question. */
function getMatchingPairs(
  question: QuizAttemptReviewQuestion,
): { left: string; right: string }[] {
  return (
    (question as { matching_correct?: { [key: string]: unknown }[] | null })
      .matching_correct ?? []
  )
    .map((p) => ({ left: toStr(p.left), right: toStr(p.right) }))
    .filter((p) => p.left);
}

/** The per-pair matching review block (student answer vs correct answer). */
function MatchingReview({ question }: { question: QuizAttemptReviewQuestion }) {
  if (question.question_type !== "matching") return null;
  const pairs = getMatchingPairs(question);
  if (pairs.length === 0) return null;
  const answer = parseMatchingAnswer(question.answer_text);
  return (
    <div className="space-y-2">
      {pairs.map((pair) => (
        <MatchingPairRow
          key={pair.left}
          left={pair.left}
          studentRight={answer[pair.left] ?? null}
          correctRight={pair.right}
        />
      ))}
    </div>
  );
}

/** Parse the student's ordering submission (JSON array of items). */
function parseOrderingAnswer(answerText: string | null | undefined): string[] {
  if (!answerText) return [];
  try {
    const data = JSON.parse(answerText);
    if (Array.isArray(data)) {
      return data.map((v) => toStr(v)).filter((v) => v);
    }
  } catch {
    // fall through
  }
  return [];
}

/**
 * The ordering review block: each element shows its CORRECT position on the
 * left — green when the student placed it there, red otherwise. A small sort
 * button flips the list to the correct order and back (hidden when the
 * student's order is already correct). Ordering grading stays all-or-nothing.
 */
function OrderingReview({ question }: { question: QuizAttemptReviewQuestion }) {
  const { t } = useTranslation();
  const [showCorrect, setShowCorrect] = useState(false);
  if (question.question_type !== "ordering") return null;
  const correct = (
    (question as { ordering_correct?: string[] | null }).ordering_correct ?? []
  ).map((v) => toStr(v));
  if (correct.length === 0) return null;

  const student = parseOrderingAnswer(question.answer_text);
  const fullyCorrect =
    student.length === correct.length &&
    student.every((s, i) => s === correct[i]);
  const display = showCorrect ? correct : student;
  const posOf = new Map(correct.map((item, i) => [item, i]));

  return (
    <div className="space-y-2">
      {display.map((item, i) => {
        const correctIdx = posOf.get(item) ?? -1;
        const atRightPlace = correctIdx === i;
        return (
          <div
            key={`${item}-${i}`}
            className="flex items-center gap-3 rounded-xl border-2 border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5"
          >
            <span
              className={cn(
                "w-7 h-7 shrink-0 flex items-center justify-center rounded-lg font-bold text-sm tabular-nums",
                atRightPlace
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700",
              )}
            >
              {correctIdx >= 0 ? correctIdx + 1 : "?"}
            </span>
            <span className="flex-1 min-w-0 text-sm sm:text-base text-m3-on-surface font-medium">
              {item}
            </span>
          </div>
        );
      })}
      {!fullyCorrect && (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setShowCorrect((v) => !v)}
          className="text-xs font-semibold text-m3-primary gap-1.5 rounded-lg"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {showCorrect
            ? t("course_quiz_review.back_to_my_order")
            : t("course_quiz_review.sort_to_correct")}
        </Button>
      )}
    </div>
  );
}

/** Parse a fill_blank submission (JSON array of slot values). */
function parseFillBlankAnswer(
  answerText: string | null | undefined,
): (string | null)[] {
  if (!answerText) return [];
  try {
    const data = JSON.parse(answerText);
    if (Array.isArray(data)) {
      return data.map((v) => (typeof v === "string" && v ? v : null));
    }
  } catch {
    // fall through
  }
  return [];
}

/** The positional correct answers for a fill_blank question. */
function getFillBlankCorrect(question: QuizAttemptReviewQuestion): string[] {
  return (
    (question as { fill_blank_correct?: string[] | null }).fill_blank_correct ??
    []
  ).map((v) => toStr(v));
}

/** One fill_blank slot in review: green ✓ when right, red ✕ + → correct when wrong. */
function FillBlankSlotReview({
  student,
  correct,
}: {
  student: string | null;
  correct: string;
}) {
  const right =
    student != null &&
    student.trim().toLowerCase() === correct.trim().toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 mx-1 px-2 py-0.5 align-middle rounded-lg border-2 text-sm font-semibold",
        right
          ? "border-emerald-400 bg-emerald-500/10 text-emerald-700"
          : "border-red-400 bg-red-500/10",
      )}
    >
      {right ? (
        <>
          <span>{student}</span>
          <Check className="h-3.5 w-3.5 shrink-0" />
        </>
      ) : (
        <>
          <span className="text-red-700 line-through">{student ?? "—"}</span>
          <X className="h-3.5 w-3.5 text-red-700 shrink-0" />
          <ArrowRight className="h-3.5 w-3.5 text-m3-outline shrink-0" />
          <span className="text-emerald-700">{correct}</span>
        </>
      )}
    </span>
  );
}

/** The fill_blank review block: correct answer shown only beside wrong blanks. */
function FillBlankReview({ question }: { question: QuizAttemptReviewQuestion }) {
  if (question.question_type !== "fill_blank") return null;
  const correct = getFillBlankCorrect(question);
  if (correct.length === 0) return null;
  const student = parseFillBlankAnswer(question.answer_text);
  const segments = question.prompt_text.split(/_{3,}/g);
  return (
    <div className="rounded-xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/20 text-sm sm:text-base leading-loose text-m3-on-surface">
      {segments.map((seg, i) => (
        <span key={i}>
          {seg}
          {i < correct.length && (
            <FillBlankSlotReview
              student={student[i] ?? null}
              correct={correct[i]}
            />
          )}
        </span>
      ))}
    </div>
  );
}

/** The short_answer review block: green ✓ when right, red ✕ + correct when wrong. */
function ShortAnswerReview({ question }: { question: QuizAttemptReviewQuestion }) {
  if (question.question_type !== "short_answer") return null;
  const correct = (question as { short_answer_correct?: string | null })
    .short_answer_correct;
  if (!correct) return null;
  const student = question.answer_text ?? "";
  const right = question.is_correct;
  return (
    <div className="rounded-xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/20">
      <div className="flex items-center gap-2 flex-wrap text-sm">
        {right ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
            <Check className="h-4 w-4 shrink-0" />
            {student}
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
              <X className="h-4 w-4 shrink-0" />
              {student || <span className="italic font-normal text-m3-on-surface-variant">—</span>}
            </span>
            <ArrowRight className="h-4 w-4 text-m3-outline shrink-0" />
            <span className="font-semibold text-emerald-700">{correct}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Matching is graded all-or-nothing, but a PARTIALLY-correct answer gets a
 *  yellow outline (some pairs right, not all). Arranging stays green/red. */
function computeCardTone(
  question: QuizAttemptReviewQuestion,
): "green" | "yellow" | "red" {
  if (question.is_correct) return "green";
  if (question.question_type === "matching") {
    const pairs = getMatchingPairs(question);
    if (pairs.length > 0) {
      const answer = parseMatchingAnswer(question.answer_text);
      const correctCount = pairs.filter(
        (p) =>
          answer[p.left] != null &&
          answer[p.left].trim().toLowerCase() === p.right.trim().toLowerCase(),
      ).length;
      if (correctCount > 0 && correctCount < pairs.length) return "yellow";
    }
  }
  return "red";
}

/** Whether the raw "Your answer" box should render under the question. */
function shouldShowAnswerBox(question: QuizAttemptReviewQuestion): boolean {
  if (question.question_type === "mcq" || question.answer_text == null) {
    return false;
  }
  if (
    question.question_type === "matching" &&
    getMatchingPairs(question).length > 0
  ) {
    return false;
  }
  if (
    question.question_type === "ordering" &&
    ((question as { ordering_correct?: string[] | null }).ordering_correct ??
      []).length > 0
  ) {
    return false;
  }
  if (
    question.question_type === "fill_blank" &&
    getFillBlankCorrect(question).length > 0
  ) {
    return false;
  }
  if (
    question.question_type === "short_answer" &&
    (question as { short_answer_correct?: string | null }).short_answer_correct
  ) {
    return false;
  }
  return true;
}

/**
 * One question in the per-question breakdown: green outline when answered
 * correctly, red otherwise. Options are collapsed — a correct question shows
 * only the correct answer; a wrong one shows the student's pick (red ✕) and
 * the correct answer (green ✓), with the remaining options behind a
 * "show all" toggle. Explanation + meta row stay at the bottom.
 */
export function ReviewQuestionCard({
  question,
  index,
}: {
  question: QuizAttemptReviewQuestion;
  index: number;
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const correctOption = question.options.find((o) => o.is_correct);
  const pickedOption = question.options.find(
    (o) => o.id === question.selected_option_id,
  );
  const cardTone = computeCardTone(question);
  const showAnswerBox = shouldShowAnswerBox(question);

  // Visible rows: correct question → just the right answer. Wrong question →
  // the pick + the right answer, everything else revealed on demand.
  let visible = question.is_correct
    ? correctOption
      ? [correctOption]
      : []
    : [pickedOption, correctOption].filter(
        (o): o is QuizAttemptReviewOption =>
          o !== undefined &&
          question.options.some((x) => x.id === o.id),
      );
  if (!question.is_correct && showAll) visible = question.options;

  const hiddenCount = Math.max(
    0,
    question.options.length - visible.length,
  );

  return (
    <GlassCard
      id={`review-question-${question.question_id}`}
      className={cn(
        "p-4 space-y-4 scroll-mt-24",
        cardTone === "green"
          ? "ring-2 ring-emerald-400/70"
          : cardTone === "yellow"
            ? "ring-2 ring-amber-400/70"
            : "ring-2 ring-red-400/70",
      )}
    >
      <QuestionHeader question={question} index={index} />

      {visible.length > 0 && (
        <div className="space-y-2">
          {visible.map((opt) => (
            <ReviewOptionRow
              key={opt.id}
              option={opt}
              mark={
                opt.id === question.selected_option_id && !opt.is_correct
                  ? "wrong"
                  : opt.is_correct
                    ? "correct"
                    : null
              }
              selected={opt.id === question.selected_option_id}
            />
          ))}
        </div>
      )}

      <MatchingReview question={question} />
      <OrderingReview question={question} />
      <FillBlankReview question={question} />
      <ShortAnswerReview question={question} />

      {!question.is_correct && hiddenCount > 0 && (
        <Button
          type="button"
          variant="link"
          onClick={() => setShowAll((v) => !v)}
          className="h-auto p-0 text-xs font-semibold text-m3-primary underline underline-offset-2"
        >
          {showAll
            ? t("course_quiz_review.hide_options")
            : t("course_quiz_review.show_all_options", {
                count: hiddenCount,
              })}
        </Button>
      )}

      {showAnswerBox && (
        <div className="rounded-xl bg-m3-surface-container-low p-4 border border-m3-outline-variant/20">
          <p className="text-[10px] uppercase tracking-widest font-bold text-m3-on-surface-variant mb-1">
            {t("course_quiz_review.your_answer")}
          </p>
          <p className="text-sm text-m3-on-surface whitespace-pre-wrap">
            {question.answer_text}
          </p>
        </div>
      )}

      {question.explanation && (
        <div className="pt-2">
          <div className="rounded-xl bg-m3-primary-fixed/30 p-4 border border-m3-primary/15 flex gap-3">
            <Lightbulb className="h-4 w-4 text-m3-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-m3-primary mb-1">
                {t("course_quiz_review.explanation")}
              </p>
              <div className="text-sm text-m3-on-surface">
                <RichContent
                  value={question.explanation}
                  format={
                    (question as { explanation_format?: string | null })
                      .explanation_format ?? "plain"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <QuestionMetaRow question={question} />
    </GlassCard>
  );
}

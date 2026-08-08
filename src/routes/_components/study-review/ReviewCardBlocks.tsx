import { useTranslation } from "react-i18next";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { RichContent } from "@/components/ui/rich-content";
import type { ReviewSubmitResult } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Hint — parity with the quiz-taking flow. Viewing it flags the answer
 * as assisted recall, which caps the SM-2 grade at Q≤2 so a hinted
 * review can't inflate the card's interval the way an unaided one does.
 * Only offered before grading and only when the question carries one.
 */
export function ReviewHintBlock({
  hintText,
  hintFormat,
  hintShown,
  onShowHint,
}: {
  hintText: string;
  hintFormat: string;
  hintShown: boolean;
  onShowHint: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      {hintShown ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <Lightbulb className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="min-w-0 space-y-0.5">
            <RichContent
              value={hintText}
              format={hintFormat}
              className="text-sm text-amber-900"
            />
            <p className="text-[11px] text-amber-700/80">
              {t(
                "study_review.hint_counts",
                "Using a hint counts as assisted recall.",
              )}
            </p>
          </div>
        </div>
      ) : (
        <Button variant="link"
          type="button"
          onClick={onShowHint}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
        >
          <Lightbulb className="h-4 w-4" />
          {t("study_review.show_hint", "Show hint")}
        </Button>
      )}
    </div>
  );
}

/** Feedback after grading. */
export function ReviewFeedback({ result }: { result: ReviewSubmitResult }) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "rounded-xl p-4 flex items-start gap-3",
        result.correct
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800",
      )}
    >
      {result.correct ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="h-5 w-5 shrink-0 text-red-600" />
      )}
      <div className="space-y-1 min-w-0">
        <p className="font-semibold text-sm">
          {result.correct
            ? t("study_review.correct", "Correct!")
            : t("study_review.incorrect", "Not quite.")}
        </p>
        {!result.correct && result.correct_answer_text && (
          <p className="text-xs">
            {t("study_review.correct_answer", "Answer")}:{" "}
            <span className="font-semibold">{result.correct_answer_text}</span>
          </p>
        )}
        {result.explanation && (
          <p className="text-xs opacity-90">{result.explanation}</p>
        )}
        <p className="text-xs opacity-80">
          {result.passing
            ? t("study_review.next_in", {
                days: result.interval_days,
                defaultValue: "Next review in {{days}} day(s).",
              })
            : t("study_review.will_repeat", "You'll see this one again soon.")}
        </p>
      </div>
    </div>
  );
}

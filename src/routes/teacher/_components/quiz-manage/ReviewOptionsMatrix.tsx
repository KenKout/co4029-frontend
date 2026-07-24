import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { ReviewOptions } from "@/lib/api/hooks/quizzes";

/**
 * Phase 2 — review-visibility matrix editor. A 3-window × 5-flag grid letting a
 * teacher control what a student sees AFTER submitting, per time-window. All-true
 * = today's always-on behaviour. Self-contained (value + onChange) so it drops
 * into the Settings tab without bloating quiz-manage.tsx.
 */

export type ReviewWindowFlags = ReviewOptions["immediately_after"];

const WINDOW_KEYS = [
  "immediately_after",
  "later_while_open",
  "after_close",
] as const;

const FLAG_KEYS = [
  "show_score",
  "show_correctness",
  "show_correct_answers",
  "show_explanation",
  "show_points",
] as const;

type WindowKey = (typeof WINDOW_KEYS)[number];
type FlagKey = (typeof FLAG_KEYS)[number];

/** All-true default matrix (preserves historical always-show behaviour). */
export function defaultReviewOptions(): ReviewOptions {
  const allTrue: ReviewWindowFlags = {
    show_score: true,
    show_correctness: true,
    show_correct_answers: true,
    show_explanation: true,
    show_points: true,
  };
  return {
    immediately_after: { ...allTrue },
    later_while_open: { ...allTrue },
    after_close: { ...allTrue },
  };
}

export function ReviewOptionsMatrix({
  value,
  onChange,
}: {
  value: ReviewOptions;
  onChange: (next: ReviewOptions) => void;
}) {
  const { t } = useTranslation();

  function toggle(win: WindowKey, flag: FlagKey) {
    const window = { ...value[win], [flag]: !value[win][flag] };
    onChange({ ...value, [win]: window });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-m3-on-surface-variant">
            <th className="px-3 py-2 text-left font-semibold">
              {t("teacher_quiz_manage.settings.review.flag_col")}
            </th>
            {WINDOW_KEYS.map((win) => (
              <th key={win} className="px-3 py-2 text-center font-semibold">
                {t(`teacher_quiz_manage.settings.review.windows.${win}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FLAG_KEYS.map((flag) => (
            <tr key={flag} className="border-t border-m3-outline-variant/20">
              <td className="px-3 py-2 text-m3-on-surface">
                {t(`teacher_quiz_manage.settings.review.flags.${flag}`)}
              </td>
              {WINDOW_KEYS.map((win) => (
                <td key={win} className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={value[win][flag]}
                    onChange={() => toggle(win, flag)}
                    aria-label={`${t(
                      `teacher_quiz_manage.settings.review.flags.${flag}`,
                    )} — ${t(
                      `teacher_quiz_manage.settings.review.windows.${win}`,
                    )}`}
                    className={cn(
                      "h-4 w-4 cursor-pointer rounded border-m3-outline-variant",
                      "text-m3-primary focus:ring-m3-primary/40",
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

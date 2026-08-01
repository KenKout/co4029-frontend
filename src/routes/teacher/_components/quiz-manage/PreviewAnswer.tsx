import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";

import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Read-only answer-key projections for the Preview tab, one component per
 * question type plus a type→component lookup. Extracted from PreviewQuestion
 * verbatim: each type carries its answer on different columns (option rows vs
 * numeric_answer vs match_pairs vs ordering_sequence), so a shared branch chain
 * bought nothing — the map dispatches to exactly the projection the type needs.
 */

interface PreviewAnswerProps {
  question: QuizQuestionAuthoring;
  correctAnswer: string | string[] | null;
}

function PreviewOptionsAnswer({ question }: PreviewAnswerProps) {
  const { t } = useTranslation();
  if (question.options.length === 0) return null;

  return (
    <div className="space-y-2 pl-10">
      {/* Multi-select changes how the student answers (checkboxes, and
          grading is all-or-nothing), so it must be visible in preview —
          otherwise a 2-correct-answer question looks like a broken MCQ. */}
      {question.single_answer === false && (
        <p className="text-[11px] font-semibold text-m3-on-surface-variant">
          {t("teacher_quiz_manage.preview.multi_select_note")}
        </p>
      )}
      {question.options.map((opt) => (
        <div
          key={opt.id}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm",
            opt.is_correct
              ? "border-2 border-emerald-300 bg-emerald-50/60 text-m3-on-surface font-medium"
              : "border border-m3-outline-variant/20 bg-m3-surface text-m3-on-surface",
          )}
        >
          <span className="font-bold text-m3-on-surface-variant">
            {opt.option_key}.
          </span>
          <span className="flex-1">
            {opt.option_text || (
              <span className="italic text-m3-on-surface-variant">
                {t("teacher_quiz_manage.preview.no_content")}
              </span>
            )}
          </span>
          {opt.is_correct && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              {t("teacher_quiz_manage.preview.correct")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function PreviewShortAnswer({ correctAnswer }: PreviewAnswerProps) {
  const { t } = useTranslation();

  return (
    <div className="pl-10">
      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface">
        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mr-2">
          {t("teacher_quiz_manage.preview.correct")}
        </span>
        {typeof correctAnswer === "string" && correctAnswer.length > 0 ? (
          correctAnswer
        ) : (
          <span className="italic text-m3-on-surface-variant">
            {t("teacher_quiz_manage.preview.no_content")}
          </span>
        )}
      </div>
    </div>
  );
}

function PreviewFillBlankAnswer({ correctAnswer }: PreviewAnswerProps) {
  const { t } = useTranslation();

  return (
    <div className="pl-10">
      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
          {t("teacher_quiz_manage.preview.correct")}
        </div>
        {Array.isArray(correctAnswer) && correctAnswer.length > 0 ? (
          correctAnswer.map((blank, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-bold text-m3-on-surface-variant text-xs w-6">
                {i + 1}.
              </span>
              <span>{blank}</span>
            </div>
          ))
        ) : (
          <span className="italic text-m3-on-surface-variant">
            {t("teacher_quiz_manage.preview.no_content")}
          </span>
        )}
      </div>
    </div>
  );
}

function PreviewNumericalAnswer({ question }: PreviewAnswerProps) {
  const { t } = useTranslation();

  return (
    <div className="pl-10">
      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface">
        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mr-2">
          {t("teacher_quiz_manage.preview.correct")}
        </span>
        {question.numeric_answer != null ? (
          <span className="tabular-nums font-medium">
            {question.numeric_answer}
            {question.numeric_tolerance != null &&
              Number(question.numeric_tolerance) > 0 && (
                <span className="ml-2 text-xs font-normal text-m3-on-surface-variant">
                  {t("teacher_quiz_manage.preview.tolerance", {
                    value: question.numeric_tolerance,
                  })}
                </span>
              )}
          </span>
        ) : (
          <span className="italic text-m3-on-surface-variant">
            {t("teacher_quiz_manage.preview.no_content")}
          </span>
        )}
      </div>
    </div>
  );
}

function PreviewMatchingAnswer({ question }: PreviewAnswerProps) {
  const { t } = useTranslation();

  return (
    <div className="pl-10">
      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface space-y-1.5">
        <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
          {t("teacher_quiz_manage.preview.correct_pairs")}
        </div>
        {Array.isArray(question.match_pairs) &&
        question.match_pairs.length > 0 ? (
          question.match_pairs.map((pair, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="font-medium">{pair.left}</span>
              <span aria-hidden className="text-m3-on-surface-variant shrink-0">
                →
              </span>
              <span className="flex-1">{pair.right}</span>
            </div>
          ))
        ) : (
          <span className="italic text-m3-on-surface-variant">
            {t("teacher_quiz_manage.preview.no_content")}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-m3-on-surface-variant italic">
        {t("teacher_quiz_manage.preview.matching_note")}
      </p>
    </div>
  );
}

function PreviewOrderingAnswer({ question }: PreviewAnswerProps) {
  const { t } = useTranslation();

  return (
    <div className="pl-10">
      <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
          {t("teacher_quiz_manage.preview.correct_order")}
        </div>
        {Array.isArray(question.ordering_sequence) &&
        question.ordering_sequence.length > 0 ? (
          question.ordering_sequence.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="font-bold text-m3-on-surface-variant text-xs w-6 tabular-nums">
                {i + 1}.
              </span>
              <span>{item}</span>
            </div>
          ))
        ) : (
          <span className="italic text-m3-on-surface-variant">
            {t("teacher_quiz_manage.preview.no_content")}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-m3-on-surface-variant italic">
        {t("teacher_quiz_manage.preview.ordering_note")}
      </p>
    </div>
  );
}

const PREVIEW_ANSWER_BY_TYPE: Record<
  string,
  ComponentType<PreviewAnswerProps> | undefined
> = {
  multiple_choice: PreviewOptionsAnswer,
  true_false: PreviewOptionsAnswer,
  short_answer: PreviewShortAnswer,
  fill_blank: PreviewFillBlankAnswer,
  numerical: PreviewNumericalAnswer,
  matching: PreviewMatchingAnswer,
  ordering: PreviewOrderingAnswer,
};

export function PreviewAnswer({ question, correctAnswer }: PreviewAnswerProps) {
  const Answer = PREVIEW_ANSWER_BY_TYPE[question.question_type];
  if (!Answer) return null;
  return <Answer question={question} correctAnswer={correctAnswer} />;
}

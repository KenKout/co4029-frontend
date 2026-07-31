import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { TypeSpecificAnswerEditor } from "./TypeSpecificAnswerEditor";
import { buildQuestionDraft, countBlanks, readCorrectAnswer } from "./helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import {
  useDuplicateQuizQuestion,
  useRegenerateQuestion,
  useUpdateQuizQuestion,
} from "@/lib/api/hooks/quizzes";
import type { PendingQuestionDelete } from "@/lib/api/hooks/quizzes";
import type {
  CourseLearningOutcomeAuthoring,
  QuizQuestionAuthoring,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * One editable question. Holds its own draft so typing doesn't re-render
 * sibling cards, and reports unsaved state up via onDirtyChange.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 */
export function QuestionCard({
  quizId,
  question,
  outcomes,
  selected,
  onToggleSelect,
  onQueueDelete,
  published = false,
  onDirtyChange,
}: {
  quizId: string;
  question: QuizQuestionAuthoring;
  outcomes: CourseLearningOutcomeAuthoring[];
  selected: boolean;
  onToggleSelect: () => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
  /** Published quizzes are frozen — the mutating actions (Save / Approve /
   *  Regenerate / Delete) are hidden entirely rather than shown disabled,
   *  since the backend hard-rejects every edit with 409. */
  published?: boolean;
  /** Reports unsaved-edit state up to the navigator. */
  onDirtyChange?: (questionId: string, dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const updateQuestion = useUpdateQuizQuestion(quizId, question.id);
  const regenerate = useRegenerateQuestion(quizId, question.id);
  const duplicate = useDuplicateQuizQuestion(quizId);

  async function handleDuplicate() {
    try {
      await duplicate.mutateAsync(question.id);
      toast.success(
        t(
          "teacher_quiz_manage.editor.duplicate_success",
          "Question duplicated (added as a pending copy)",
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.message
          ? err.message
          : t(
              "teacher_quiz_manage.editor.duplicate_error",
              "Could not duplicate the question",
            ),
      );
    }
  }

  const [draft, setDraft] = useState(() => buildQuestionDraft(question));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(buildQuestionDraft(question));
  }, [question]);

  // Local edits not yet PATCHed.
  //
  // The baseline deliberately uses the RAW saved expected time, not
  // buildQuestionDraft's defaulted one. buildQuestionDraft pre-fills
  // DEFAULT_EXPECTED_SECONDS when the saved value is null, so comparing against
  // it would cancel the default out on both sides — the field would look
  // populated while the row stayed null, and the question wouldn't register as
  // unsaved. Baselining on the raw value makes that pre-filled default show up
  // as exactly what it is: an unsaved local edit.
  const isUnsaved = useMemo(() => {
    const savedSeconds =
      question.expected_response_time_ms == null
        ? null
        : Math.round(question.expected_response_time_ms / 1000);
    const savedBaseline = {
      ...buildQuestionDraft(question),
      expected_response_seconds: savedSeconds,
    };
    return JSON.stringify(draft) !== JSON.stringify(savedBaseline);
  }, [draft, question]);

  // Report dirtiness up so the navigator can show a Saved/Unsaved badge. The
  // draft itself stays local to the card (lifting it would re-render every
  // sibling card on each keystroke).
  useEffect(() => {
    onDirtyChange?.(question.id, isUnsaved);
  }, [question.id, isUnsaved, onDirtyChange]);

  // Unmount cleanup: a card that scrolls out of the list (or is deleted) must
  // not leave a stale "unsaved" flag behind in the parent.
  useEffect(
    () => () => {
      onDirtyChange?.(question.id, false);
    },
    [question.id, onDirtyChange],
  );

  const hasOptions =
    (question.question_type === "multiple_choice" ||
      question.question_type === "true_false") &&
    draft.options.length > 0;
  // Phase 7: multi-select is MCQ-only (true_false is always single-answer).
  // Read the DRAFT flag, not the saved row, so flipping the toggle switches the
  // option inputs to checkboxes immediately — before the teacher hits Save.
  const allowMultiCorrect =
    question.question_type === "multiple_choice" && !draft.single_answer;
  const correctAnswer = readCorrectAnswer(question);
  const blankCount =
    question.question_type === "fill_blank"
      ? countBlanks(question.prompt_text ?? "")
      : 0;
  const expectedSeconds =
    question.expected_response_time_ms == null
      ? null
      : Math.round(question.expected_response_time_ms / 1000);
  // Live validity of the DRAFT value, for inline field feedback while typing.
  // Distinct from hasInvalidExpectedTime(question), which reflects the SAVED
  // row and drives the navigator's error state.
  const draftTimeInvalid =
    draft.expected_response_seconds == null ||
    !Number.isFinite(draft.expected_response_seconds) ||
    draft.expected_response_seconds <= 0;

  async function handleSave(reviewStatus = draft.review_status) {
    if (!draft.prompt_text.trim()) {
      toast.error(t("teacher_quiz_manage.errors.prompt_required"));
      return;
    }
    // Expected response time is REQUIRED — the SR scheduler and pacing
    // analytics divide by it, so saving null/0 would produce a broken question
    // that the backend rejects at publish time anyway. Fail fast here with a
    // pointed message instead of letting it through to a publish-time 422.
    if (
      draft.expected_response_seconds == null ||
      !Number.isFinite(draft.expected_response_seconds) ||
      draft.expected_response_seconds <= 0
    ) {
      toast.error(t("teacher_quiz_manage.errors.expected_time_required"));
      return;
    }
    if (hasOptions) {
      if (draft.options.some((o) => !o.option_text.trim())) {
        toast.error(t("teacher_quiz_manage.errors.option_text_required"));
        return;
      }
      // Phase 7: the correct-count rule depends on the multi-select toggle.
      // Multi-select needs >= 1 correct (matching the backend validator);
      // single-answer still requires exactly 1.
      const correctCount = draft.options.filter((o) => o.is_correct).length;
      if (allowMultiCorrect) {
        if (correctCount < 1) {
          toast.error(t("teacher_quiz_manage.errors.at_least_one_correct"));
          return;
        }
      } else if (correctCount !== 1) {
        toast.error(t("teacher_quiz_manage.errors.exactly_one_correct"));
        return;
      }
    }
    try {
      await updateQuestion.mutateAsync({
        prompt_text: draft.prompt_text.trim(),
        hint_text: draft.hint_text.trim() || null,
        explanation: draft.explanation.trim() || null,
        difficulty: draft.difficulty,
        // bloom_level and expected_ef_ceiling are no longer teacher-editable
        // (removed from the question editor). This is a partial PATCH, so
        // omitting them leaves any existing backend values untouched.
        // Validated as required above, so this is always a positive integer.
        expected_response_time_ms:
          Math.max(1, Math.round(draft.expected_response_seconds)) * 1000,
        review_status: reviewStatus,
        learning_outcome_id: draft.learning_outcome_id || null,
        ...(hasOptions
          ? {
              options: draft.options.map((o) => ({
                id: o.id,
                option_key: o.option_key,
                option_text: o.option_text.trim(),
                is_correct: o.is_correct,
              })),
            }
          : {}),
        // Phase 7: type-specific answer fields. Sent per question type so the
        // backend persists the answer key (numerical/matching/ordering) or the
        // multi-select discriminator (multiple_choice). Omitted for types that
        // don't use them, leaving existing values untouched (partial PATCH).
        ...(question.question_type === "multiple_choice"
          ? { single_answer: draft.single_answer }
          : {}),
        ...(question.question_type === "numerical"
          ? {
              numeric_answer:
                draft.numeric_answer.trim() === ""
                  ? null
                  : Number(draft.numeric_answer),
              numeric_tolerance:
                draft.numeric_tolerance.trim() === ""
                  ? 0
                  : Number(draft.numeric_tolerance),
            }
          : {}),
        ...(question.question_type === "matching"
          ? {
              match_pairs: draft.match_pairs
                .filter((p) => p.left.trim() && p.right.trim())
                .map((p) => ({ left: p.left.trim(), right: p.right.trim() })),
            }
          : {}),
        ...(question.question_type === "ordering"
          ? {
              ordering_sequence: draft.ordering_sequence
                .map((s) => s.trim())
                .filter((s) => s.length > 0),
            }
          : {}),
      });
      toast.success(
        reviewStatus === "approved"
          ? t("teacher_quiz_manage.toasts.question_approved")
          : t("teacher_quiz_manage.toasts.question_saved"),
      );
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.save_question_failed"),
      );
    }
  }

  function handleDelete() {
    // Deferred: stage the delete (optimistically hidden by the parent) and
    // start/refresh the 5s combo timer. The Undo banner can revert it; the
    // real DELETE only fires when the combo commits. No confirm step needed
    // — undo IS the safety net.
    const prompt = (question.prompt_text ?? "").trim();
    onQueueDelete({
      id: question.id,
      label: prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt,
    });
  }

  async function handleRegenerate() {
    try {
      await regenerate.mutateAsync();
      toast.success(t("teacher_quiz_manage.toasts.regen_started"));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t("teacher_quiz_manage.toasts.regen_in_progress"));
        return;
      }
      toast.error(
        (err as Error).message || t("teacher_quiz_manage.toasts.regen_failed"),
      );
    }
  }

  return (
    <div
      id={`qcard-${question.id}`}
      // scroll-margin keeps the card clear of the sticky header when the
      // question navigator scrolls it into view.
      className={cn(
        "rounded-xl border bg-m3-surface p-4 space-y-3 scroll-mt-[9.5rem]",
        selected
          ? "border-m3-primary shadow-sm"
          : "border-m3-outline-variant/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="h-4 w-4"
          />
          <span className="sr-only">
            {t("teacher_quiz_manage.questions.sr_select", {
              position: question.position,
            })}
          </span>
        </label>
        <Badge className="border-0 bg-m3-primary-fixed text-m3-primary text-[10px]">
          {t("teacher_quiz_manage.questions.position_label", {
            position: question.position,
          })}
        </Badge>
        <Badge className="border-0 bg-blue-50 text-blue-800 text-[10px] capitalize">
          {question.question_type.replace("_", " ")}
        </Badge>
        <Badge
          className={cn(
            "border-0 text-[10px] capitalize",
            question.review_status === "approved"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          )}
        >
          {question.review_status}
        </Badge>
        {expectedSeconds !== null ? (
          <Badge className="border-0 bg-m3-surface-container-high text-m3-on-surface text-[10px] gap-1">
            <Clock className="h-3 w-3" />
            {expectedSeconds}s
          </Badge>
        ) : (
          <Badge className="border-0 bg-amber-50 text-amber-700 text-[10px] gap-1">
            <Clock className="h-3 w-3" />
            {t("teacher_quiz_manage.questions.no_time_set")}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.editor.prompt_label")}
        </label>
        <textarea
          value={draft.prompt_text}
          onChange={(e) =>
            setDraft((current) => ({ ...current, prompt_text: e.target.value }))
          }
          rows={3}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.outcome.label", "Learning outcome")}
        </label>
        <Select<string>
          value={draft.learning_outcome_id ?? ""}
          onValueChange={(next) =>
            setDraft((current) => ({
              ...current,
              learning_outcome_id: next || null,
            }))
          }
          options={[
            {
              value: "",
              label: t("teacher_quiz_manage.outcome.none", "No outcome"),
            },
            ...outcomes.map((outcome) => ({
              value: outcome.id,
              label: `${"\u00A0".repeat((outcome.depth ?? 0) * 2)}L.O.${
                outcome.code ?? outcome.position
              } — ${
                outcome.outcome_text.length > 60
                  ? `${outcome.outcome_text.slice(0, 60)}…`
                  : outcome.outcome_text
              }`,
            })),
          ]}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.hint_label",
            "Hint (shown to learner on request)",
          )}
        </label>
        <textarea
          value={draft.hint_text}
          onChange={(e) =>
            setDraft((current) => ({ ...current, hint_text: e.target.value }))
          }
          rows={2}
          placeholder={t(
            "teacher_quiz_manage.editor.hint_placeholder",
            "e.g. Think about which property distinguishes analytical storage from transactional storage.",
          )}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
        <p className="text-[11px] text-m3-on-surface-variant">
          {t(
            "teacher_quiz_manage.editor.hint_help",
            'Optional. Only shown to learners if "Show hints" is enabled in Quiz Settings. Must not reveal the answer.',
          )}
        </p>
      </div>

      {hasOptions && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_quiz_manage.editor.options_label")}
          </label>
          {draft.options.map((option, idx) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2",
                option.is_correct
                  ? "border-2 border-emerald-300 bg-emerald-50/60"
                  : "border border-m3-outline-variant/20 bg-m3-surface-container-lowest",
              )}
            >
              {/* Phase 7: honour the multi-select toggle. When multiple correct
                  answers are allowed the teacher needs checkboxes that toggle
                  independently; a radio group would silently clear the others
                  (and true_false is always single-answer). */}
              <input
                type={allowMultiCorrect ? "checkbox" : "radio"}
                name={allowMultiCorrect ? undefined : `correct-${question.id}`}
                checked={option.is_correct}
                aria-label={t("teacher_quiz_manage.editor.mark_correct", {
                  key: option.option_key,
                })}
                onChange={() =>
                  setDraft((current) => ({
                    ...current,
                    options: current.options.map((o, j) =>
                      allowMultiCorrect
                        ? j === idx
                          ? { ...o, is_correct: !o.is_correct }
                          : o
                        : { ...o, is_correct: j === idx },
                    ),
                  }))
                }
                className="h-4 w-4"
              />
              <span className="font-bold text-m3-on-surface-variant text-sm">
                {option.option_key}.
              </span>
              <input
                type="text"
                value={option.option_text}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    options: current.options.map((o, j) =>
                      j === idx ? { ...o, option_text: e.target.value } : o,
                    ),
                  }))
                }
                disabled={question.question_type === "true_false"}
                className="flex-1 bg-transparent text-sm text-m3-on-surface focus:outline-none disabled:text-m3-on-surface-variant disabled:cursor-not-allowed"
              />
            </div>
          ))}
        </div>
      )}

      {question.question_type === "short_answer" && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.correct_answer_label",
              "Correct answer",
            )}
          </label>
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface">
            {typeof correctAnswer === "string" && correctAnswer.length > 0 ? (
              correctAnswer
            ) : (
              <span className="text-m3-on-surface-variant italic">
                {t(
                  "teacher_quiz_manage.editor.correct_answer_missing",
                  "(missing — regenerate to refresh)",
                )}
              </span>
            )}
          </div>
          <p className="text-[11px] text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.correct_answer_short_hint",
              "Grader is case-insensitive and treats hyphenated and unhyphenated forms as equivalent.",
            )}
          </p>
        </div>
      )}

      {question.question_type === "fill_blank" && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.fill_blank_label",
              "Blanks (in stem order)",
            )}
          </label>
          <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/60 px-3 py-2.5 text-sm text-m3-on-surface space-y-1">
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
              <span className="text-m3-on-surface-variant italic">
                {t(
                  "teacher_quiz_manage.editor.correct_answer_missing",
                  "(missing — regenerate to refresh)",
                )}
              </span>
            )}
          </div>
          <p className="text-[11px] text-m3-on-surface-variant">
            {t(
              "teacher_quiz_manage.editor.fill_blank_hint",
              "Stem must contain {{count}} blank(s) marked with three or more underscores ({{marker}}).",
              {
                count: Array.isArray(correctAnswer)
                  ? correctAnswer.length
                  : blankCount,
                marker: "___",
              },
            )}
          </p>
        </div>
      )}

      <TypeSpecificAnswerEditor
        questionType={question.question_type}
        value={{
          single_answer: draft.single_answer,
          numeric_answer: draft.numeric_answer,
          numeric_tolerance: draft.numeric_tolerance,
          match_pairs: draft.match_pairs,
          ordering_sequence: draft.ordering_sequence,
        }}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      />

      {/* Explanation comes before Configuration: it's the content-authoring
          field (what students see), so it sits with the question body; the
          Configuration block (difficulty / expected time) is metadata and
          follows it. */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_quiz_manage.editor.explanation_label")}
        </label>
        <textarea
          value={draft.explanation}
          onChange={(e) =>
            setDraft((current) => ({ ...current, explanation: e.target.value }))
          }
          rows={2}
          className="w-full rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5 text-sm text-m3-on-surface resize-none focus:outline-none focus:ring-2 focus:ring-m3-secondary/30"
        />
      </div>

      <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-m3-secondary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary">
            {t("teacher_quiz_manage.editor.metadata_label", "Configuration")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
              {t("teacher_quiz_manage.editor.difficulty_label", "Difficulty")}
            </label>
            <Select<string>
              value={draft.difficulty}
              onValueChange={(next) =>
                setDraft((current) => ({
                  ...current,
                  difficulty: next,
                }))
              }
              options={["easy", "medium", "hard"].map((level) => ({
                value: level,
                label: level,
              }))}
              size="sm"
              className="capitalize"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor={`qexp-${question.id}`}
              className="text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant"
            >
              {t("teacher_quiz_manage.editor.t_exp_label", "Expected time (s)")}
              {/* Required marker — the SR scheduler divides by this value. */}
              <span className="ml-0.5 text-red-600" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id={`qexp-${question.id}`}
              type="number"
              min={1}
              max={600}
              required
              aria-invalid={draftTimeInvalid || undefined}
              aria-describedby={
                draftTimeInvalid ? `qexp-err-${question.id}` : undefined
              }
              value={draft.expected_response_seconds ?? ""}
              placeholder={t(
                "teacher_quiz_manage.editor.t_exp_placeholder",
                "e.g. 45",
              )}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  expected_response_seconds:
                    e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className={cn(
                "h-8 bg-m3-surface text-xs",
                draftTimeInvalid &&
                  "border-red-500 focus-visible:ring-red-500/30",
              )}
            />
            {draftTimeInvalid && (
              <p
                id={`qexp-err-${question.id}`}
                className="text-[10px] font-semibold text-red-600"
              >
                {t("teacher_quiz_manage.errors.expected_time_required")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Published quiz = frozen. Hide the mutating actions entirely (Save /
          Approve / Regenerate / Delete) rather than showing them disabled —
          the backend rejects every edit with 409, so a greyed-out row would
          only invite dead clicks. The card stays visible read-only. */}
      {!published && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave()}
            disabled={updateQuestion.isPending}
            className="gap-2"
          >
            {updateQuestion.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t("common.save")}
          </Button>
          {question.review_status !== "approved" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleSave("approved")}
              disabled={updateQuestion.isPending}
              className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("teacher_quiz_manage.editor.approve")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRegenerate}
            disabled={regenerate.isPending}
            className="gap-2"
          >
            {regenerate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t("teacher_quiz_manage.editor.regenerate")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDuplicate}
            disabled={duplicate.isPending}
            className="gap-2"
            title={t("teacher_quiz_manage.editor.duplicate", "Duplicate")}
          >
            {duplicate.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {t("teacher_quiz_manage.editor.duplicate", "Duplicate")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 ml-auto"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("common.delete")}
          </Button>
        </div>
      )}

      {/* Delete confirmation. On confirm we still route through the deferred
          queue + undo banner (the real DELETE fires when the 5s combo commits),
          but the teacher now has an explicit confirm step before the question
          disappears. */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-m3-surface p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-headline font-bold text-base text-m3-on-surface">
                  {t(
                    "teacher_quiz_manage.confirm_delete_question.title",
                    "Delete this question?",
                  )}
                </h2>
                <p className="text-sm text-m3-on-surface-variant">
                  {t(
                    "teacher_quiz_manage.confirm_delete_question.body",
                    "The question will be removed. You'll have a few seconds to undo before it's permanently deleted.",
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  handleDelete();
                }}
                className="bg-red-600 text-white hover:bg-red-700 border-0 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

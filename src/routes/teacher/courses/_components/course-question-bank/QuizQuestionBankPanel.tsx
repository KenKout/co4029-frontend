import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateCuratedQuizQuestion,
  useCuratedQuizQuestionBank,
  useDeleteCuratedQuizQuestion,
  useSetCuratedQuizQuestionStatus,
  useUpdateCuratedQuizQuestion,
} from "@/lib/api/hooks/quizzes";
import type {
  QuizQuestionBankItem,
  QuizQuestionBankStatus,
} from "@/lib/api/types";

/**
 * Option VALUES only — the labels are resolved through `t()` at render time.
 *
 * These used to carry hardcoded English labels, which is why this whole tab
 * stayed English on a Vietnamese UI. A module constant is evaluated once at
 * import, before i18next is even initialised, so it cannot hold translated
 * copy at all: the values live here and the copy lives in the locale files.
 */
const TYPE_VALUES = [
  "",
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank",
  "code",
  "numerical",
  "matching",
  "ordering",
] as const;

/**
 * The types this form can author COMPLETELY — prompt plus the answer key the
 * grader needs.
 *
 * `short_answer` is deliberately absent even though the filter list above
 * includes it (existing short-answer items copied in from a quiz are still
 * browsable and importable). The grader reads a short answer's expected text
 * from `original_generated_payload.correct_answer`, and neither this form nor
 * `QuizQuestionBankItemCreate` has any field that can set it. A short answer
 * authored here would therefore carry no key at all: every submission scores
 * zero and lands in the manual-grading queue with no reference answer for the
 * teacher to mark against. Offering the type without the field does not create
 * a short-answer question — it creates a hand-grading obligation the teacher
 * never agreed to.
 *
 * Restore it here the moment the create schema can carry an answer key.
 */
const CREATE_TYPE_VALUES = TYPE_VALUES.filter(
  (value) =>
    value === "multiple_choice" ||
    value === "true_false" ||
    value === "numerical",
);

const STATUS_VALUES = ["", "draft", "approved", "archived"] as const;

const DIFFICULTY_VALUES = ["", "easy", "medium", "hard"] as const;

const K = "teacher_question_bank.quiz";

/** Build a Select's options, translating each value's label. */
function useOptions(
  values: readonly string[],
  key: (value: string) => string,
): { value: string; label: string }[] {
  const { t } = useTranslation();
  // `key` and `values` are module-level constants at every call site, so the
  // only dependency that ever actually changes here is the active language.
  return useMemo(
    () => values.map((value) => ({ value, label: t(key(value)) })),
    [values, key, t],
  );
}

const typeKey = (value: string) => `${K}.type_${value || "all"}`;
const statusKey = (value: string) => `${K}.status_${value || "all"}`;
const difficultyKey = (value: string) => `${K}.difficulty_${value || "all"}`;

type ConfirmAction = {
  kind: "approve" | "archive" | "delete";
  item: QuizQuestionBankItem;
} | null;

function StatusBadge({ status }: { status: QuizQuestionBankStatus }) {
  const { t } = useTranslation();
  const classes = {
    draft: "bg-amber-50 text-amber-800",
    approved: "bg-emerald-50 text-emerald-800",
    archived: "bg-slate-100 text-slate-700",
  }[status];
  // No `capitalize`: the label is translated copy now, already cased for its
  // own language, and Vietnamese does not capitalise mid-sentence nouns.
  return (
    <Badge className={`border-0 ${classes}`}>{t(statusKey(status))}</Badge>
  );
}

function NewBankQuestionForm({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const create = useCreateCuratedQuizQuestion(courseId);
  const typeOptions = useOptions(CREATE_TYPE_VALUES, typeKey);
  const difficultyOptions = useOptions(DIFFICULTY_VALUES, difficultyKey);
  const [open, setOpen] = useState(false);
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [prompt, setPrompt] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [numericAnswer, setNumericAnswer] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  function reset() {
    setPrompt("");
    setDifficulty("");
    setNumericAnswer("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    setOpen(false);
  }

  async function submit() {
    if (!prompt.trim()) {
      toast.error(t(`${K}.prompt_required`));
      return;
    }
    const optionPayload =
      questionType === "multiple_choice"
        ? options
            .map((text, index) => ({ text: text.trim(), index }))
            .filter((option) => option.text)
            .map((option, position) => ({
              option_key: String.fromCharCode(65 + position),
              option_text: option.text,
              is_correct: option.index === correctIndex,
              position: position + 1,
              option_format: "plain",
            }))
        : questionType === "true_false"
          ? [
              {
                option_key: "T",
                option_text: "True",
                is_correct: correctIndex === 0,
                position: 1,
                option_format: "plain",
              },
              {
                option_key: "F",
                option_text: "False",
                is_correct: correctIndex === 1,
                position: 2,
                option_format: "plain",
              },
            ]
          : [];
    try {
      await create.mutateAsync({
        question_type: questionType as QuizQuestionBankItem["question_type"],
        prompt_text: prompt.trim(),
        difficulty: (difficulty || null) as QuizQuestionBankItem["difficulty"],
        numeric_answer:
          questionType === "numerical" && numericAnswer
            ? Number(numericAnswer)
            : null,
        status: "draft",
        options: optionPayload,
      });
      toast.success(t(`${K}.created`));
      reset();
    } catch (error) {
      toast.error((error as Error).message || t(`${K}.create_failed`));
    }
  }

  return (
    <div className="rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((current) => !current)}
        className="h-auto w-full justify-between rounded-xl p-4"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" /> {t(`${K}.new_question`)}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
      {open ? (
        <div className="space-y-3 border-t border-m3-outline-variant/20 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={questionType}
              onValueChange={setQuestionType}
              options={typeOptions}
              aria-label={t(`${K}.question_type_label`)}
            />
            <Select
              value={difficulty}
              onValueChange={setDifficulty}
              options={difficultyOptions}
              aria-label={t(`${K}.difficulty_label`)}
            />
          </div>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t(`${K}.prompt_placeholder`)}
            rows={3}
          />
          {questionType === "multiple_choice" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((option, index) => (
                <label
                  key={index}
                  className="flex items-center gap-2 rounded-lg border border-m3-outline-variant/20 p-2"
                >
                  <input
                    type="radio"
                    name="bank-correct-option"
                    checked={correctIndex === index}
                    onChange={() => setCorrectIndex(index)}
                  />
                  <Input
                    value={option}
                    onChange={(event) =>
                      setOptions((current) =>
                        current.map((value, position) =>
                          position === index ? event.target.value : value,
                        ),
                      )
                    }
                    placeholder={t(`${K}.option_placeholder`, {
                      letter: String.fromCharCode(65 + index),
                    })}
                  />
                </label>
              ))}
            </div>
          ) : null}
          {questionType === "true_false" ? (
            <Select
              value={String(correctIndex)}
              onValueChange={(value) => setCorrectIndex(Number(value))}
              options={[
                { value: "0", label: t(`${K}.correct_true`) },
                { value: "1", label: t(`${K}.correct_false`) },
              ]}
            />
          ) : null}
          {questionType === "numerical" ? (
            <Input
              type="number"
              value={numericAnswer}
              onChange={(event) => setNumericAnswer(event.target.value)}
              placeholder={t(`${K}.numeric_placeholder`)}
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={reset}>
              {t(`${K}.cancel`)}
            </Button>
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={create.isPending}
            >
              {create.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t(`${K}.create_draft`)}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function QuizQuestionBankPanel({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [editing, setEditing] = useState<QuizQuestionBankItem | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  const filters = useMemo(
    () => ({
      status: status as QuizQuestionBankStatus | "",
      questionType,
      difficulty,
      search: searchInput.trim(),
    }),
    [difficulty, questionType, searchInput, status],
  );
  const statusOptions = useOptions(STATUS_VALUES, statusKey);
  const typeOptions = useOptions(TYPE_VALUES, typeKey);
  const difficultyOptions = useOptions(DIFFICULTY_VALUES, difficultyKey);
  const bank = useCuratedQuizQuestionBank(courseId, filters);
  const update = useUpdateCuratedQuizQuestion(courseId);
  const setItemStatus = useSetCuratedQuizQuestionStatus(courseId);
  const deleteItem = useDeleteCuratedQuizQuestion(courseId);

  async function saveEdit() {
    if (!editing || !editPrompt.trim()) return;
    try {
      const updated = await update.mutateAsync({
        itemId: editing.id,
        patch: { prompt_text: editPrompt.trim() },
      });
      toast.success(
        updated.status === "draft" && editing.status === "approved"
          ? t(`${K}.demoted_to_draft`)
          : t(`${K}.updated`),
      );
      setEditing(null);
    } catch (error) {
      toast.error((error as Error).message || t(`${K}.update_failed`));
    }
  }

  async function runConfirmedAction() {
    if (!confirm) return;
    try {
      if (confirm.kind === "delete") {
        await deleteItem.mutateAsync(confirm.item.id);
        toast.success(t(`${K}.deleted`));
      } else {
        await setItemStatus.mutateAsync({
          itemId: confirm.item.id,
          status: confirm.kind === "approve" ? "approved" : "archived",
        });
        toast.success(
          confirm.kind === "approve"
            ? t(`${K}.approved_toast`)
            : t(`${K}.archived_toast`),
        );
      }
      setConfirm(null);
    } catch (error) {
      toast.error((error as Error).message || t(`${K}.action_failed`));
    }
  }

  const pendingAction = setItemStatus.isPending || deleteItem.isPending;
  // Falls back to "approve" only while the dialog is closing (`confirm` is
  // already null but the exit animation still renders the old copy).
  const confirmKind = confirm?.kind ?? "approve";
  return (
    <div className="space-y-4">
      <NewBankQuestionForm courseId={courseId} />

      <div className="rounded-xl border border-m3-outline-variant/30 bg-m3-surface p-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-m3-on-surface-variant" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t(`${K}.search_placeholder`)}
            className="pl-9"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Select
            value={status}
            onValueChange={setStatus}
            options={statusOptions}
          />
          <Select
            value={questionType}
            onValueChange={setQuestionType}
            options={typeOptions}
          />
          <Select
            value={difficulty}
            onValueChange={setDifficulty}
            options={difficultyOptions}
          />
        </div>
      </div>

      {bank.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : bank.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(bank.error as Error).message}
        </div>
      ) : bank.items.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("teacher_question_bank.quiz_empty_filtered_title")}
          description={t("teacher_question_bank.quiz_empty_filtered_body")}
          className="rounded-xl border border-dashed border-m3-outline-variant/40"
        />
      ) : (
        <InfiniteList
          items={bank.items}
          keyOf={(item) => item.id}
          hasNextPage={bank.hasNextPage}
          fetchNextPage={bank.fetchNextPage}
          isFetchingNextPage={bank.isFetchingNextPage}
          isLoading={bank.isLoading}
          className="space-y-3"
          renderItem={(item) => (
            <article className="rounded-xl border border-m3-outline-variant/30 bg-m3-surface p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                <Badge variant="outline">
                  {t(typeKey(item.question_type))}
                </Badge>
                {item.difficulty ? (
                  <Badge variant="outline">
                    {t(difficultyKey(item.difficulty))}
                  </Badge>
                ) : null}
                {item.source_question_id ? (
                  <span className="text-xs text-m3-on-surface-variant">
                    {t(`${K}.saved_from_quiz`)}
                  </span>
                ) : null}
              </div>
              {editing?.id === item.id ? (
                <Textarea
                  value={editPrompt}
                  onChange={(event) => setEditPrompt(event.target.value)}
                  rows={3}
                />
              ) : (
                <p className="text-sm font-medium text-m3-on-surface">
                  {item.prompt_text}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {editing?.id === item.id ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(null)}
                    >
                      {t(`${K}.cancel`)}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveEdit()}
                      disabled={update.isPending}
                    >
                      {t(`${K}.save`)}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(item);
                      setEditPrompt(item.prompt_text);
                    }}
                    className="gap-2"
                  >
                    <Pencil className="h-3.5 w-3.5" /> {t(`${K}.edit`)}
                  </Button>
                )}
                {item.status !== "approved" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirm({ kind: "approve", item })}
                    className="gap-2 border-emerald-200 text-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t(`${K}.approve`)}
                  </Button>
                ) : null}
                {item.status !== "archived" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirm({ kind: "archive", item })}
                    className="gap-2"
                  >
                    <Archive className="h-3.5 w-3.5" /> {t(`${K}.archive`)}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirm({ kind: "delete", item })}
                  className="ml-auto gap-2 border-red-200 text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t(`${K}.delete`)}
                </Button>
              </div>
            </article>
          )}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !pendingAction) setConfirm(null);
        }}
        title={t(`${K}.confirm_${confirmKind}_title`)}
        description={t(`${K}.confirm_${confirmKind}_body`)}
        confirmLabel={t(`${K}.${confirmKind}`)}
        confirmVariant={confirm?.kind === "delete" ? "destructive" : "default"}
        isPending={pendingAction}
        onConfirm={() => void runConfirmedAction()}
      />
    </div>
  );
}

import { useMemo, useState } from "react";
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

const TYPE_OPTIONS = [
  { value: "", label: "All question types" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / false" },
  { value: "short_answer", label: "Short answer" },
  { value: "fill_blank", label: "Fill blank" },
  { value: "code", label: "Code" },
  { value: "numerical", label: "Numerical" },
  { value: "matching", label: "Matching" },
  { value: "ordering", label: "Ordering" },
] as const;

const CREATE_TYPE_OPTIONS = TYPE_OPTIONS.filter(
  (option) =>
    option.value === "multiple_choice" ||
    option.value === "true_false" ||
    option.value === "short_answer" ||
    option.value === "numerical",
);

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "", label: "All difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

type ConfirmAction =
  | { kind: "approve" | "archive" | "delete"; item: QuizQuestionBankItem }
  | null;

function statusBadge(status: QuizQuestionBankStatus) {
  const classes = {
    draft: "bg-amber-50 text-amber-800",
    approved: "bg-emerald-50 text-emerald-800",
    archived: "bg-slate-100 text-slate-700",
  }[status];
  return <Badge className={`border-0 capitalize ${classes}`}>{status}</Badge>;
}

function NewBankQuestionForm({ courseId }: { courseId: string }) {
  const create = useCreateCuratedQuizQuestion(courseId);
  const [open, setOpen] = useState(false);
  const [questionType, setQuestionType] = useState("short_answer");
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
      toast.error("Question text is required");
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
      toast.success("Draft bank question created");
      reset();
    } catch (error) {
      toast.error((error as Error).message || "Could not create question");
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
          <Plus className="h-4 w-4" /> New Quiz bank question
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {open ? (
        <div className="space-y-3 border-t border-m3-outline-variant/20 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={questionType}
              onValueChange={setQuestionType}
              options={CREATE_TYPE_OPTIONS}
              aria-label="Question type"
            />
            <Select
              value={difficulty}
              onValueChange={setDifficulty}
              options={DIFFICULTY_OPTIONS}
              aria-label="Difficulty"
            />
          </div>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Question text"
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
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
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
                { value: "0", label: "Correct answer: True" },
                { value: "1", label: "Correct answer: False" },
              ]}
            />
          ) : null}
          {questionType === "numerical" ? (
            <Input
              type="number"
              value={numericAnswer}
              onChange={(event) => setNumericAnswer(event.target.value)}
              placeholder="Correct numerical answer"
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={reset}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create draft
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function QuizQuestionBankPanel({ courseId }: { courseId: string }) {
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
          ? "Saved as draft because approved content changed"
          : "Question updated",
      );
      setEditing(null);
    } catch (error) {
      toast.error((error as Error).message || "Could not update question");
    }
  }

  async function runConfirmedAction() {
    if (!confirm) return;
    try {
      if (confirm.kind === "delete") {
        await deleteItem.mutateAsync(confirm.item.id);
        toast.success("Question removed from bank");
      } else {
        await setItemStatus.mutateAsync({
          itemId: confirm.item.id,
          status: confirm.kind === "approve" ? "approved" : "archived",
        });
        toast.success(
          confirm.kind === "approve" ? "Question approved" : "Question archived",
        );
      }
      setConfirm(null);
    } catch (error) {
      toast.error((error as Error).message || "Action failed");
    }
  }

  const pendingAction = setItemStatus.isPending || deleteItem.isPending;
  return (
    <div className="space-y-4">
      <NewBankQuestionForm courseId={courseId} />

      <div className="rounded-xl border border-m3-outline-variant/30 bg-m3-surface p-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-m3-on-surface-variant" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search Quiz bank questions"
            className="pl-9"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={status} onValueChange={setStatus} options={STATUS_OPTIONS} />
          <Select
            value={questionType}
            onValueChange={setQuestionType}
            options={TYPE_OPTIONS}
          />
          <Select
            value={difficulty}
            onValueChange={setDifficulty}
            options={DIFFICULTY_OPTIONS}
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
        <div className="rounded-xl border border-dashed border-m3-outline-variant/40 p-10 text-center text-sm text-m3-on-surface-variant">
          No curated Quiz questions match these filters.
        </div>
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
                {statusBadge(item.status)}
                <Badge variant="outline" className="capitalize">
                  {item.question_type.replace(/_/g, " ")}
                </Badge>
                {item.difficulty ? (
                  <Badge variant="outline" className="capitalize">
                    {item.difficulty}
                  </Badge>
                ) : null}
                {item.source_question_id ? (
                  <span className="text-xs text-m3-on-surface-variant">Saved from a quiz</span>
                ) : null}
              </div>
              {editing?.id === item.id ? (
                <Textarea
                  value={editPrompt}
                  onChange={(event) => setEditPrompt(event.target.value)}
                  rows={3}
                />
              ) : (
                <p className="text-sm font-medium text-m3-on-surface">{item.prompt_text}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {editing?.id === item.id ? (
                  <>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={() => void saveEdit()} disabled={update.isPending}>
                      Save
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
                    <Pencil className="h-3.5 w-3.5" /> Edit
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
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
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
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirm({ kind: "delete", item })}
                  className="ml-auto gap-2 border-red-200 text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
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
        title={
          confirm?.kind === "delete"
            ? "Delete bank question?"
            : confirm?.kind === "archive"
              ? "Archive bank question?"
              : "Approve bank question?"
        }
        description={
          confirm?.kind === "delete"
            ? "Already imported Quiz questions remain unchanged. This bank item will no longer be available."
            : confirm?.kind === "archive"
              ? "The question will be hidden from new imports. Existing imported questions are unaffected."
              : "Approved questions become available for import into editable quizzes."
        }
        confirmLabel={
          confirm?.kind === "delete"
            ? "Delete"
            : confirm?.kind === "archive"
              ? "Archive"
              : "Approve"
        }
        confirmVariant={confirm?.kind === "delete" ? "destructive" : "default"}
        isPending={pendingAction}
        onConfirm={() => void runConfirmedAction()}
      />
    </div>
  );
}

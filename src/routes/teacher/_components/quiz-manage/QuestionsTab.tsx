import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BookOpen,
  FileUp,
  HelpCircle,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { BulkSetExpectedTimeBar } from "./BulkSetExpectedTimeBar";
import { QuestionCard } from "./QuestionCard";
import { QuestionNavigator } from "./QuestionNavigator";
import { DEFAULT_EXPECTED_SECONDS, hasInvalidExpectedTime } from "./helpers";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import {
  useBulkApprove,
  useBulkSetExpectedTime,
} from "@/lib/api/hooks/quizzes";
import type { PendingQuestionDelete } from "@/lib/api/hooks/quizzes";
import type {
  CourseLearningOutcomeAuthoring,
  QuizQuestionAuthoring,
} from "@/lib/api/types";

/**
 * Questions tab: bulk-action bar, the question list, add-question controls,
 * and the AI/import side panel. Owns per-question unsaved state so the
 * navigator can render a Saved/Unsaved layer.
 *
 * Extracted from the former 3.5k-line quiz-manage.tsx; behaviour unchanged.
 */
export function QuestionsTab({
  quizId,
  questions,
  outcomes,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  bulkSeconds,
  onBulkSecondsChange,
  onAddQuestion,
  addPending,
  onOpenGenerator,
  onOpenBank,
  onOpenImportExport,
  onQueueDelete,
  published = false,
  onDirtyCountChange,
}: {
  quizId: string;
  questions: QuizQuestionAuthoring[];
  outcomes: CourseLearningOutcomeAuthoring[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  bulkSeconds: string;
  onBulkSecondsChange: (value: string) => void;
  onAddQuestion: (questionType?: string) => void | Promise<void>;
  addPending: boolean;
  onOpenGenerator: () => void;
  onOpenBank: () => void;
  onOpenImportExport: () => void;
  onQueueDelete: (item: PendingQuestionDelete) => void;
  /** Published quiz: hide all authoring controls (bulk bar, add-question,
   *  per-card actions) instead of disabling them. */
  published?: boolean;
  /** How many question cards currently hold unsaved edits. The parent uses
   *  this to guard tab switches, which unmount this whole subtree. */
  onDirtyCountChange?: (count: number) => void;
}) {
  const { t } = useTranslation();
  const bulkSet = useBulkSetExpectedTime(quizId);
  const bulkApprove = useBulkApprove(quizId);
  // Which questions have unsaved local edits. Owned here (not in each card) so
  // the navigator can render a Saved/Unsaved layer; each card reports its own
  // dirty state up via onDirtyChange.
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  // Bulk delete is gated behind a confirm dialog (see handler below). The
  // count is frozen when the dialog opens: the confirm handler clears the
  // selection, and reading live `selectedIds.size` would make the dialog copy
  // flicker to "Delete 0 questions?" during the close animation.
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<number | null>(
    null,
  );
  // Mirror the dirty-card count up to the page, which owns the tab strip and
  // needs it to decide whether switching away would discard work. Reset on
  // unmount so a confirmed "Quit" doesn't leave the parent armed with a stale
  // count after this subtree is gone.
  useEffect(() => {
    onDirtyCountChange?.(dirtyIds.size);
  }, [dirtyIds.size, onDirtyCountChange]);
  useEffect(() => {
    return () => onDirtyCountChange?.(0);
  }, [onDirtyCountChange]);

  const handleDirtyChange = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((prev) => {
      if (dirty === prev.has(id)) return prev; // no-op keeps referential identity
      const next = new Set(prev);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const pendingCount = questions.filter(
    (q) => q.review_status !== "approved",
  ).length;

  // Split the "no expected time on the row" population into the two cases that
  // need different messaging (see the banners below). A question is only
  // genuinely blank if the editor also has no value for it — otherwise the
  // editor is showing a pre-filled default that merely needs saving.
  const noSavedTimeQuestions = questions.filter(hasInvalidExpectedTime);
  const unsavedDefaultTimeIds = noSavedTimeQuestions
    .filter((q) => dirtyIds.has(q.id))
    .map((q) => q.id);
  const unsavedDefaultTimeCount = unsavedDefaultTimeIds.length;
  const blankExpectedTimeCount =
    noSavedTimeQuestions.length - unsavedDefaultTimeCount;

  /** Persist the pre-filled default time for every affected question at once. */
  async function handleSaveDefaultTimes() {
    try {
      const result = await bulkSet.mutateAsync({
        question_ids: unsavedDefaultTimeIds,
        expected_seconds: DEFAULT_EXPECTED_SECONDS,
      });
      toast.success(
        t("teacher_quiz_manage.toasts.expected_time_set", {
          count: result.updated,
        }),
      );
    } catch (err) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.expected_time_failed"),
      );
    }
  }

  const secondsValue = Number(bulkSeconds);
  const bulkValid =
    selectedIds.size > 0 && Number.isFinite(secondsValue) && secondsValue > 0;

  async function handleApplyBulk() {
    try {
      const result = await bulkSet.mutateAsync({
        question_ids: Array.from(selectedIds),
        expected_seconds: secondsValue,
      });
      toast.success(
        t("teacher_quiz_manage.toasts.expected_time_set", {
          count: result.updated,
        }),
      );
      onClearSelection();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.expected_time_failed"),
      );
    }
  }

  async function handleApproveBulk() {
    try {
      const result = await bulkApprove.mutateAsync({
        question_ids: Array.from(selectedIds),
      });
      toast.success(
        t("teacher_quiz_manage.toasts.bulk_approved", {
          count: result.approved,
        }),
      );
      onClearSelection();
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_quiz_manage.toasts.bulk_approve_failed"),
      );
    }
  }

  /** Stage every selected question for deletion in one go.
   *
   * Reuses the per-question combo-undo path (``onQueueDelete``) rather than
   * adding a bulk endpoint: each id is staged, the shared 5s countdown covers
   * the whole batch, and the undo snackbar can cancel all of them at once
   * because nothing has been sent to the server yet. Selection is cleared so
   * the bar doesn't keep acting on rows that are already hidden.
   *
   * Gated behind a confirm dialog: unlike a single-card delete, this can wipe
   * the whole quiz in one click, so the 5s undo window alone is too thin a
   * safety net — the teacher should see the count before it happens.
   */
  function handleDeleteSelectedConfirmed() {
    const targets = questions.filter((q) => selectedIds.has(q.id));
    setConfirmBulkDelete(null);
    if (targets.length === 0) return;
    for (const question of targets) {
      onQueueDelete({
        id: question.id,
        label: question.prompt_text?.slice(0, 60) || question.id,
      });
    }
    onClearSelection();
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Bulk-delete confirmation. Destructive, so no backdrop dismissal —
          the dialog primitive blocks it by default. */}
      <ConfirmDialog
        open={confirmBulkDelete !== null}
        onOpenChange={(next) =>
          setConfirmBulkDelete(next ? selectedIds.size : null)
        }
        title={t("teacher_quiz_manage.confirm_bulk_delete.title", {
          count: confirmBulkDelete ?? 0,
        })}
        description={t("teacher_quiz_manage.confirm_bulk_delete.body", {
          count: confirmBulkDelete ?? 0,
        })}
        confirmLabel={t("teacher_quiz_manage.confirm_bulk_delete.confirm", {
          count: confirmBulkDelete ?? 0,
        })}
        cancelLabel={t("common.cancel", "Cancel")}
        onConfirm={handleDeleteSelectedConfirmed}
      />
      <div className="col-span-12 lg:col-span-8 space-y-4 min-w-0">
        {/* The combo-undo snackbar now lives at page level (see
            QuizManagePage) so it stays visible when a delete is queued from
            the Preview tab too. */}
        {/* Expected response time is required. Two DISTINCT situations, and
            conflating them is what made the old copy misleading:

            (a) unsaved default — the editor pre-filled DEFAULT_EXPECTED_SECONDS
                so the field LOOKS populated, but the row is still null. Nothing
                is "missing"; the teacher just needs to Save. Actionable, not an
                error, and offers a one-click bulk Save.
            (b) genuinely blank — no value on the row AND none in the editor
                (e.g. the teacher cleared it). This blocks publishing. */}
        {questions.length > 0 && unsavedDefaultTimeCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 min-w-[12rem]">
              {t("teacher_quiz_manage.banners.unsaved_default_time", {
                count: unsavedDefaultTimeCount,
                seconds: DEFAULT_EXPECTED_SECONDS,
              })}
            </span>
            <button
              type="button"
              onClick={handleSaveDefaultTimes}
              disabled={bulkSet.isPending}
              className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {bulkSet.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                t("teacher_quiz_manage.banners.save_default_time")
              )}
            </button>
          </div>
        )}

        {questions.length > 0 && blankExpectedTimeCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("teacher_quiz_manage.banners.missing_expected_time", {
                count: blankExpectedTimeCount,
              })}
            </span>
          </div>
        )}

        {questions.length > 0 && pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-900">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("teacher_quiz_manage.banners.pending_review", {
                count: pendingCount,
              })}
            </span>
          </div>
        )}

        {/* Bulk set-time / approve is authoring only — a published quiz is
            frozen, so hide the whole bar rather than leave dead controls. */}
        {!published && (
          <BulkSetExpectedTimeBar
            totalQuestions={questions.length}
            selectedCount={selectedIds.size}
            bulkSeconds={bulkSeconds}
            onBulkSecondsChange={onBulkSecondsChange}
            onSelectAll={onSelectAll}
            onClear={onClearSelection}
            onApply={handleApplyBulk}
            applyValid={bulkValid}
            applying={bulkSet.isPending}
            onApprove={handleApproveBulk}
            approveValid={selectedIds.size > 0}
            approving={bulkApprove.isPending}
            onDeleteSelected={() => setConfirmBulkDelete(selectedIds.size)}
          />
        )}

        {questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-m3-outline-variant/30 bg-m3-surface-container-lowest p-10 text-center space-y-3">
            <HelpCircle className="h-10 w-10 text-m3-outline-variant mx-auto" />
            <div>
              <p className="font-headline font-bold text-m3-on-surface">
                {t("teacher_quiz_manage.empty.no_questions_title")}
              </p>
              <p className="text-sm text-m3-on-surface-variant mt-1 max-w-md mx-auto">
                {t("teacher_quiz_manage.empty.no_questions_body")}
              </p>
            </div>
          </div>
        ) : (
          questions.map((question) => (
            <QuestionCard
              key={question.id}
              quizId={quizId}
              question={question}
              outcomes={outcomes}
              selected={selectedIds.has(question.id)}
              onToggleSelect={() => onToggleSelect(question.id)}
              onQueueDelete={onQueueDelete}
              published={published}
              onDirtyChange={handleDirtyChange}
            />
          ))
        )}

        {/* Add-question controls are authoring only — hidden on a published
            (frozen) quiz so no new questions can be seeded. */}
        {!published && (
          <div className="flex flex-wrap items-stretch gap-2">
            <button
              type="button"
              onClick={() => onAddQuestion("multiple_choice")}
              disabled={addPending}
              className="flex-1 min-w-[12rem] flex items-center justify-center gap-2 border-2 border-dashed border-m3-outline-variant/40 rounded-xl px-6 py-4 text-sm font-bold text-m3-on-surface-variant hover:border-m3-primary hover:text-m3-primary hover:bg-m3-primary/5 transition-all disabled:opacity-60 cursor-pointer"
            >
              {addPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("teacher_quiz_manage.actions.add_question")}
            </button>
            {/* Phase 7: type picker — add a question of any supported type.
              Selecting a value seeds the right shape; the reset to "" keeps
              this a pure action control (not stateful). */}
            <Select<string>
              aria-label={t("teacher_quiz_manage.actions.add_question_of_type")}
              disabled={addPending}
              value=""
              onValueChange={(next) => {
                if (next) void onAddQuestion(next);
              }}
              options={[
                {
                  value: "",
                  label: t("teacher_quiz_manage.actions.add_other_type"),
                },
                {
                  value: "true_false",
                  label: t("teacher_quiz_manage.type_editor.type_true_false"),
                },
                {
                  value: "short_answer",
                  label: t("teacher_quiz_manage.type_editor.type_short_answer"),
                },
                {
                  value: "numerical",
                  label: t("teacher_quiz_manage.type_editor.type_numerical"),
                },
                {
                  value: "matching",
                  label: t("teacher_quiz_manage.type_editor.type_matching"),
                },
                {
                  value: "ordering",
                  label: t("teacher_quiz_manage.type_editor.type_ordering"),
                },
              ]}
              className="w-auto shrink-0 border-dashed py-4 font-bold"
            />
          </div>
        )}
      </div>

      <div className="col-span-12 lg:col-span-4 min-w-0">
        <div className="lg:sticky lg:top-[8.5rem] space-y-4">
          {/* AI generation / bank import / file import all SEED new questions,
              which a published quiz can't accept — hide the whole authoring
              panel when frozen. The read-only QuestionNavigator stays so the
              teacher can still jump between questions. */}
          {!published && (
            <div className="rounded-xl border border-m3-secondary/10 bg-m3-surface-container-low p-5 shadow-glass space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="font-headline font-bold text-sm text-m3-on-surface">
                    {t("teacher_quiz_manage.ai_panel.title")}
                  </h2>
                  <p className="text-xs text-m3-on-surface-variant">
                    {t("teacher_quiz_manage.ai_panel.description")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={onOpenGenerator}
                className="w-full gap-2 gradient-primary text-white border-0 shadow-ai-glow"
              >
                <Sparkles className="h-4 w-4" />
                {t("teacher_quiz_manage.ai_panel.open_generator")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onOpenBank}
                className="w-full gap-2"
              >
                <BookOpen className="h-4 w-4" />
                {t(
                  "teacher_quiz_manage.ai_panel.import_from_bank",
                  "Import from bank",
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onOpenImportExport}
                className="w-full gap-2"
              >
                <FileUp className="h-4 w-4" />
                {t("teacher_quiz_manage.ai_panel.import_export_file")}
              </Button>
            </div>
          )}

          {/* Quick question navigation — jumps (auto-scrolls) to a question
              card. Reuses the numbered-box design from the student quiz. */}
          <QuestionNavigator
            questions={questions}
            selectedIds={selectedIds}
            dirtyIds={dirtyIds}
          />
        </div>
      </div>
    </div>
  );
}

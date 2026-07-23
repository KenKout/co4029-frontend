/**
 * Question bank modal — browse and import authored questions across the
 * course (T-bank, FR-bank).
 *
 * Three concerns:
 *
 * 1. Filter strip — module / lesson / type / bloom / difficulty / search
 *    + review_status toggle. Filters live in component state and feed
 *    the ``useQuestionBank`` query directly so each change re-fetches.
 *
 * 2. Result list — checkbox per row, prompt preview, badges for type +
 *    bloom + difficulty, parent quiz title. The target quiz's own
 *    questions are excluded server-side via ``exclude_quiz_id``.
 *
 * 3. Import action — single bulk POST to
 *    ``/teacher/quizzes/{quiz_id}/questions/import``. On success we
 *    invalidate the authoring cache so the parent ``QuizManage`` view
 *    immediately renders the cloned questions at the bottom.
 *
 * Modal patterns mirror :file:`quiz-manage.tsx`'s ``GenerateModal`` — a
 * single ``fixed inset-0`` overlay with a centered card, ``Escape`` /
 * backdrop click both close. No external dnd / virtualised list lib —
 * the bank list is paginated server-side (50/page) so DOM size stays
 * bounded.
 */

import { useEffect, useMemo, useState } from "react";
import { Filter, Loader2, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfiniteList } from "@/components/ui/InfiniteList";
import { useCourseModules, useModuleLessons } from "@/lib/api/hooks/courses";
import {
  useImportQuestionsFromBank,
  useQuestionBank,
} from "@/lib/api/hooks/quizzes";
import type { QuestionBankEntry } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const QUESTION_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / false" },
  { value: "short_answer", label: "Short answer" },
  { value: "fill_blank", label: "Fill in the blank" },
] as const;

const BLOOM_OPTIONS = [
  { value: "", label: "Any Bloom" },
  { value: "remember", label: "Remember" },
  { value: "understand", label: "Understand" },
  { value: "apply", label: "Apply" },
  { value: "analyze", label: "Analyze" },
  { value: "evaluate", label: "Evaluate" },
  { value: "create", label: "Create" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: "", label: "Any difficulty" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

const REVIEW_STATUS_OPTIONS = [
  { value: "approved", label: "Approved only" },
  { value: "pending", label: "Pending review" },
  { value: "edited", label: "Edited" },
  { value: "", label: "All states" },
] as const;

interface Props {
  courseId: string;
  quizId: string;
  /** When provided, the modal pre-filters to this module so teachers
   *  reviewing a module-end quiz see neighbouring questions first. */
  defaultModuleId?: string;
  onClose: () => void;
}

export function QuestionBankModal({
  courseId,
  quizId,
  defaultModuleId,
  onClose,
}: Props) {
  const [moduleId, setModuleId] = useState<string>(defaultModuleId ?? "");
  const [lessonId, setLessonId] = useState<string>("");
  const [questionType, setQuestionType] = useState<string>("");
  const [bloomLevel, setBloomLevel] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [reviewStatus, setReviewStatus] = useState<string>("approved");
  const [searchInput, setSearchInput] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Debounce live search — 300 ms after the user stops typing.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const modulesQuery = useCourseModules(courseId);
  const lessonsQuery = useModuleLessons(moduleId || undefined);

  // Reset lesson selection when module changes (the lesson list is
  // module-scoped, so a lesson from module A is meaningless under B).
  useEffect(() => {
    setLessonId("");
  }, [moduleId]);

  const bank = useQuestionBank(courseId, {
    moduleId: moduleId || undefined,
    lessonId: lessonId || undefined,
    questionType: questionType || undefined,
    bloomLevel: bloomLevel || undefined,
    difficulty: difficulty || undefined,
    reviewStatus,
    search: search || undefined,
    excludeQuizId: quizId,
  });
  const rows = bank.items;
  const isLoading = bank.isLoading;
  const error = bank.error;

  const importer = useImportQuestionsFromBank(quizId);

  const activeFilterCount = useMemo(() => {
    return [
      moduleId,
      lessonId,
      questionType,
      bloomLevel,
      difficulty,
      reviewStatus !== "approved" ? "x" : "",
      search,
    ].filter(Boolean).length;
  }, [
    moduleId,
    lessonId,
    questionType,
    bloomLevel,
    difficulty,
    reviewStatus,
    search,
  ]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      for (const entry of rows) next.add(entry.question.id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function resetFilters() {
    setModuleId(defaultModuleId ?? "");
    setLessonId("");
    setQuestionType("");
    setBloomLevel("");
    setDifficulty("");
    setReviewStatus("approved");
    setSearchInput("");
    setSearch("");
  }

  async function handleImport() {
    if (selected.size === 0) {
      toast.error("Pick at least one question to import");
      return;
    }
    try {
      const cloned = await importer.mutateAsync(Array.from(selected));
      toast.success(
        `Imported ${cloned.length} question${cloned.length === 1 ? "" : "s"}`,
      );
      onClose();
    } catch (err) {
      toast.error((err as Error).message ?? "Import failed");
    }
  }

  const modules = modulesQuery.data ?? [];
  const lessons = lessonsQuery.data ?? [];
  const allVisibleSelected =
    rows.length > 0 && rows.every((entry) => selected.has(entry.question.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl rounded-xl bg-m3-surface p-6 shadow-xl space-y-4 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-ai-glow shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="space-y-1">
              <h2 className="font-headline font-bold text-base text-m3-on-surface">
                Question bank
              </h2>
              <p className="text-sm text-m3-on-surface-variant">
                Reuse approved questions across the course. Imported clones
                become draft (pending) so you can review before publishing.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 shrink-0"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search bar — full-width, debounced live search */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant pointer-events-none" />
          <Input
            type="text"
            placeholder="Search prompt or quiz title…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 bg-m3-surface pl-9 pr-9"
            autoFocus
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-m3-surface-container-low flex items-center justify-center"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5 text-m3-on-surface-variant" />
            </button>
          ) : null}
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3 w-3 text-m3-secondary" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary">
                Filters
              </p>
              {activeFilterCount > 0 ? (
                <Badge className="border-0 bg-m3-secondary-fixed/40 text-m3-on-secondary-fixed text-[10px] h-4 px-1.5">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[10px] font-medium text-m3-secondary hover:underline"
              >
                Clear all
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="h-8 rounded-md border border-m3-outline-variant/30 bg-m3-surface px-2 text-xs text-m3-on-surface focus:border-m3-secondary focus:outline-none"
              disabled={modulesQuery.isLoading}
            >
              <option value="">
                {modulesQuery.isLoading ? "Loading modules…" : "All modules"}
              </option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  Module {m.position + 1} · {m.title}
                </option>
              ))}
            </select>
            <select
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
              className="h-8 rounded-md border border-m3-outline-variant/30 bg-m3-surface px-2 text-xs text-m3-on-surface focus:border-m3-secondary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!moduleId || lessonsQuery.isLoading}
              title={moduleId ? undefined : "Pick a module first"}
            >
              <option value="">
                {!moduleId
                  ? "All lessons (pick module)"
                  : lessonsQuery.isLoading
                    ? "Loading lessons…"
                    : "All lessons in module"}
              </option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="h-8 rounded-md border border-m3-outline-variant/30 bg-m3-surface px-2 text-xs text-m3-on-surface focus:border-m3-secondary focus:outline-none"
            >
              {QUESTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={bloomLevel}
              onChange={(e) => setBloomLevel(e.target.value)}
              className="h-8 rounded-md border border-m3-outline-variant/30 bg-m3-surface px-2 text-xs text-m3-on-surface focus:border-m3-secondary focus:outline-none"
            >
              {BLOOM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="h-8 rounded-md border border-m3-outline-variant/30 bg-m3-surface px-2 text-xs text-m3-on-surface focus:border-m3-secondary focus:outline-none"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              className="h-8 rounded-md border border-m3-outline-variant/30 bg-m3-surface px-2 text-xs text-m3-on-surface focus:border-m3-secondary focus:outline-none"
            >
              {REVIEW_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result list */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-m3-outline-variant/20">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-m3-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading bank…
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-700 bg-red-50">
              Failed to load bank: {(error as Error).message}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-m3-on-surface-variant space-y-2">
              <p>No bank questions match these filters.</p>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-medium text-m3-secondary hover:underline"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <InfiniteList
              items={rows}
              hasNextPage={bank.hasNextPage}
              fetchNextPage={bank.fetchNextPage}
              isFetchingNextPage={bank.isFetchingNextPage}
              isLoading={isLoading}
              keyOf={(entry) => entry.question.id}
              className="divide-y divide-m3-outline-variant/20"
              renderItem={(entry) => (
                <BankRow
                  entry={entry}
                  selected={selected.has(entry.question.id)}
                  onToggle={() => toggle(entry.question.id)}
                />
              )}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs text-m3-on-surface-variant">
              <strong className="text-m3-on-surface">{selected.size}</strong>{" "}
              selected
              {` · ${rows.length} shown${bank.hasNextPage ? "+" : ""}`}
            </span>
            {rows.length > 0 ? (
              <button
                type="button"
                onClick={allVisibleSelected ? clearSelection : selectAllVisible}
                className="text-xs font-medium text-m3-secondary hover:underline"
              >
                {allVisibleSelected ? "Clear selection" : "Select all visible"}
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={importer.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleImport}
              disabled={importer.isPending || selected.size === 0}
              className="gap-2"
            >
              {importer.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Import {selected.size > 0 ? `(${selected.size})` : ""}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BankRow({
  entry,
  selected,
  onToggle,
}: {
  entry: QuestionBankEntry;
  selected: boolean;
  onToggle: () => void;
}) {
  const q = entry.question;
  return (
    <li
      className={cn(
        "flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-m3-surface-container-low",
        selected && "bg-m3-secondary-fixed/20",
      )}
      onClick={onToggle}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-m3-on-surface line-clamp-2">
          {q.prompt_text}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="border-0 bg-blue-50 text-blue-800 text-[10px] capitalize">
            {q.question_type.replace("_", " ")}
          </Badge>
          {q.bloom_level ? (
            <Badge className="border-0 bg-purple-50 text-purple-800 text-[10px] capitalize">
              {q.bloom_level}
            </Badge>
          ) : null}
          {q.difficulty ? (
            <Badge className="border-0 bg-amber-50 text-amber-800 text-[10px] capitalize">
              {q.difficulty}
            </Badge>
          ) : null}
          <span className="text-[10px] text-m3-on-surface-variant truncate">
            from <strong>{entry.module_title}</strong>
            {" · "}
            {entry.quiz_title}
          </span>
        </div>
      </div>
    </li>
  );
}

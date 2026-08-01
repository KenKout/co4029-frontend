import { Filter, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import {
  BLOOM_OPTIONS,
  DIFFICULTY_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
} from "./constants";
import type { QuestionBankModalController } from "./use-question-bank-modal";

/** Full-width debounced live search over prompt text and quiz title. */
export function BankSearchBar({
  controller,
}: {
  controller: QuestionBankModalController;
}) {
  const { searchInput, setSearchInput } = controller;
  return (
    <div className="relative shrink-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant pointer-events-none" />
      <Input
        type="text"
        placeholder="Search prompt or quiz title…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="h-10 pl-9 pr-9"
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
  );
}

function ModuleAndLessonSelects({
  controller,
}: {
  controller: QuestionBankModalController;
}) {
  const {
    moduleId,
    setModuleId,
    lessonId,
    setLessonId,
    modules,
    lessons,
    modulesLoading,
    lessonsLoading,
  } = controller;
  return (
    <>
      <Select<string>
        value={moduleId}
        onValueChange={(next) => setModuleId(next)}
        size="sm"
        disabled={modulesLoading}
        options={[
          {
            value: "",
            label: modulesLoading ? "Loading modules…" : "All modules",
          },
          ...modules.map((m) => ({
            value: m.id,
            label: `Module ${m.position + 1} · ${m.title}`,
          })),
        ]}
      />
      <div title={moduleId ? undefined : "Pick a module first"}>
        <Select<string>
          value={lessonId}
          onValueChange={(next) => setLessonId(next)}
          size="sm"
          disabled={!moduleId || lessonsLoading}
          options={[
            {
              value: "",
              label: !moduleId
                ? "All lessons (pick module)"
                : lessonsLoading
                  ? "Loading lessons…"
                  : "All lessons in module",
            },
            ...lessons.map((l) => ({
              value: l.id,
              label: l.title,
            })),
          ]}
        />
      </div>
    </>
  );
}

function TaxonomySelects({
  controller,
}: {
  controller: QuestionBankModalController;
}) {
  const {
    questionType,
    setQuestionType,
    bloomLevel,
    setBloomLevel,
    difficulty,
    setDifficulty,
    reviewStatus,
    setReviewStatus,
  } = controller;
  return (
    <>
      <Select<string>
        value={questionType}
        onValueChange={(next) => setQuestionType(next)}
        size="sm"
        options={QUESTION_TYPE_OPTIONS.map((opt) => ({
          value: opt.value as string,
          label: opt.label,
        }))}
      />
      <Select<string>
        value={bloomLevel}
        onValueChange={(next) => setBloomLevel(next)}
        size="sm"
        options={BLOOM_OPTIONS.map((opt) => ({
          value: opt.value as string,
          label: opt.label,
        }))}
      />
      <Select<string>
        value={difficulty}
        onValueChange={(next) => setDifficulty(next)}
        size="sm"
        options={DIFFICULTY_OPTIONS.map((opt) => ({
          value: opt.value as string,
          label: opt.label,
        }))}
      />
      <Select<string>
        value={reviewStatus}
        onValueChange={(next) => setReviewStatus(next)}
        size="sm"
        options={REVIEW_STATUS_OPTIONS.map((opt) => ({
          value: opt.value as string,
          label: opt.label,
        }))}
      />
    </>
  );
}

/** Filter card: active-count badge, clear-all, and the six filter selects. */
export function BankFilterCard({
  controller,
}: {
  controller: QuestionBankModalController;
}) {
  const { activeFilterCount, resetFilters } = controller;
  return (
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
        <ModuleAndLessonSelects controller={controller} />
        <TaxonomySelects controller={controller} />
      </div>
    </div>
  );
}

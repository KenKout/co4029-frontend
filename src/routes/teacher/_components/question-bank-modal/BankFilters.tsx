import { Filter, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
  const { t } = useTranslation();
  const { searchInput, setSearchInput } = controller;
  return (
    <div className="relative shrink-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant pointer-events-none" />
      <Input
        type="text"
        placeholder={t("question_bank.search_placeholder")}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="h-10 pl-9 pr-9"
        autoFocus
      />
      {searchInput ? (
        <Button
          variant="ghost"
          type="button"
          onClick={() => setSearchInput("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-m3-surface-container-low flex items-center justify-center"
          title={t("question_bank.clear_search")}
        >
          <X className="h-3.5 w-3.5 text-m3-on-surface-variant" />
        </Button>
      ) : null}
    </div>
  );
}

function ModuleAndLessonSelects({
  controller,
}: {
  controller: QuestionBankModalController;
}) {
  const { t } = useTranslation();
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
            label: modulesLoading
              ? t("question_bank.loading_modules")
              : t("question_bank.all_modules"),
          },
          ...modules.map((m) => ({
            value: m.id,
            label: t("question_bank.module_option", {
              position: m.position + 1,
              title: m.title,
            }),
          })),
        ]}
      />
      <div title={moduleId ? undefined : t("question_bank.pick_module_first")}>
        <Select<string>
          value={lessonId}
          onValueChange={(next) => setLessonId(next)}
          size="sm"
          disabled={!moduleId || lessonsLoading}
          options={[
            {
              value: "",
              label: !moduleId
                ? t("question_bank.all_lessons_pick_module")
                : lessonsLoading
                  ? t("question_bank.loading_lessons")
                  : t("question_bank.all_lessons_in_module"),
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
  const { t } = useTranslation();
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
          value: opt.value,
          label: t(`question_bank.question_type.${opt.value || "all"}`),
        }))}
      />
      <Select<string>
        value={bloomLevel}
        onValueChange={(next) => setBloomLevel(next)}
        size="sm"
        options={BLOOM_OPTIONS.map((opt) => ({
          value: opt.value,
          label: t(`question_bank.bloom.${opt.value || "all"}`),
        }))}
      />
      <Select<string>
        value={difficulty}
        onValueChange={(next) => setDifficulty(next)}
        size="sm"
        options={DIFFICULTY_OPTIONS.map((opt) => ({
          value: opt.value,
          label: t(`question_bank.difficulty.${opt.value || "all"}`),
        }))}
      />
      <Select<string>
        value={reviewStatus}
        onValueChange={(next) => setReviewStatus(next)}
        size="sm"
        options={REVIEW_STATUS_OPTIONS.map((opt) => ({
          value: opt.value,
          label: t(`question_bank.review_status.${opt.value || "all"}`),
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
  const { t } = useTranslation();
  const { activeFilterCount, resetFilters } = controller;
  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest p-3 space-y-2 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3 w-3 text-m3-secondary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-m3-secondary">
            {t("common.data_table.filters")}
          </p>
          {activeFilterCount > 0 ? (
            <Badge className="border-0 bg-m3-secondary-fixed/40 text-m3-on-secondary-fixed text-[10px] h-4 px-1.5">
              {activeFilterCount}
            </Badge>
          ) : null}
        </div>
        {activeFilterCount > 0 ? (
          <Button
            variant="link"
            type="button"
            onClick={resetFilters}
            className="text-[10px] font-medium text-m3-secondary hover:underline"
          >
            {t("common.clear_all")}
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <ModuleAndLessonSelects controller={controller} />
        <TaxonomySelects controller={controller} />
      </div>
    </div>
  );
}

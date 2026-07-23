import { useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Library,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import {
  useDeleteInterviewQuestionBankItem,
  useInterviewQuestionBank,
  useUpdateInterviewQuestionBankItem,
} from "@/lib/api/hooks/interviews";
import type {
  InterviewDifficulty,
  InterviewQuestionBankItemRead,
  InterviewQuestionType,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const QUESTION_TYPES: InterviewQuestionType[] = [
  "conceptual",
  "behavioral",
  "technical",
  "situational",
  "system_design",
];
const DIFFICULTIES: InterviewDifficulty[] = ["junior", "mid_level", "senior"];

function difficultyChipClass(difficulty: InterviewDifficulty): string {
  switch (difficulty) {
    case "senior":
      return "bg-purple-100 text-purple-700";
    case "mid_level":
      return "bg-blue-100 text-blue-700";
    case "junior":
    default:
      return "bg-teal-100 text-teal-700";
  }
}

interface EditorState {
  prompt_text: string;
  question_type: InterviewQuestionType;
  difficulty: InterviewDifficulty | "none";
  model_answer: string;
  tags: string[];
}

/**
 * Course-level Question Bank management page (§QBank-2). Browse / search /
 * filter / edit / delete / tag the course-scoped interview question bank in
 * one place. Adding to the bank still happens from inside interview configs
 * ("Add to question bank"); this page is the management surface over the pool.
 */
export default function CourseQuestionBankPage() {
  const { t } = useTranslation();
  const { courseId } = useParams({ strict: false }) as { courseId: string };
  const { data: course } = useTeacherCourseById(courseId);
  const { data: items, isLoading } = useInterviewQuestionBank(courseId);
  const updateItem = useUpdateInterviewQuestionBankItem(courseId);
  const deleteItem = useDeleteInterviewQuestionBankItem(courseId);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<InterviewQuestionType | "all">(
    "all",
  );
  const [difficultyFilter, setDifficultyFilter] = useState<
    InterviewDifficulty | "all"
  >("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditorState | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] =
    useState<InterviewQuestionBankItemRead | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const item of items ?? []) {
      for (const tag of item.tags ?? []) set.add(tag);
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      if (typeFilter !== "all" && item.question_type !== typeFilter)
        return false;
      if (difficultyFilter !== "all" && item.difficulty !== difficultyFilter)
        return false;
      if (tagFilter !== "all" && !(item.tags ?? []).includes(tagFilter))
        return false;
      if (!q) return true;
      return (
        item.prompt_text.toLowerCase().includes(q) ||
        (item.model_answer ?? "").toLowerCase().includes(q) ||
        (item.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [items, search, typeFilter, difficultyFilter, tagFilter]);

  const anyFilterActive =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    difficultyFilter !== "all" ||
    tagFilter !== "all";

  function beginEdit(item: InterviewQuestionBankItemRead) {
    setEditingId(item.id);
    setDraft({
      prompt_text: item.prompt_text,
      question_type: item.question_type,
      difficulty: item.difficulty ?? "none",
      model_answer: item.model_answer ?? "",
      tags: item.tags ?? [],
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }
  async function saveEdit() {
    if (!editingId || !draft || !draft.prompt_text.trim()) return;
    setSavingId(editingId);
    try {
      await updateItem.mutateAsync({
        itemId: editingId,
        patch: {
          prompt_text: draft.prompt_text.trim(),
          question_type: draft.question_type,
          difficulty: draft.difficulty === "none" ? null : draft.difficulty,
          model_answer: draft.model_answer.trim() || null,
          tags: draft.tags,
        },
      });
      toast.success(t("teacher_question_bank.saved"));
      cancelEdit();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }
  async function doDelete(item: InterviewQuestionBankItemRead) {
    try {
      await deleteItem.mutateAsync(item.id);
      toast.success(t("teacher_question_bank.deleted"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setConfirmDelete(null);
    }
  }

  const hasItems = (items?.length ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-5">
      {/* Breadcrumb / back */}
      <Link
        to="/teacher/courses/$courseId"
        params={{ courseId }}
        className="inline-flex items-center gap-1.5 text-sm text-m3-on-surface-variant hover:text-m3-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("teacher_question_bank.back_to_course")}
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-m3-primary-fixed">
          <Library className="h-5 w-5 text-m3-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="font-headline font-extrabold text-xl text-m3-on-surface">
            {t("teacher_question_bank.title")}
          </h1>
          <p className="text-sm text-m3-on-surface-variant">
            {course?.title
              ? t("teacher_question_bank.subtitle_course", {
                  course: course.title,
                })
              : t("teacher_question_bank.subtitle")}
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-4 py-3 text-xs text-m3-on-surface-variant">
        {t("teacher_question_bank.how_to_add")}
      </div>

      {/* Filters */}
      {hasItems && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/60" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("teacher_question_bank.search_placeholder")}
              aria-label={t("teacher_question_bank.search_placeholder")}
              className="bg-m3-surface text-sm pl-9"
            />
          </div>
          <FilterSelect
            label={t("teacher_question_bank.filter_type")}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as InterviewQuestionType | "all")}
            options={[
              { value: "all", label: t("teacher_question_bank.all") },
              ...QUESTION_TYPES.map((qt) => ({
                value: qt,
                label: t(`teacher_interview_config.qbank.type.${qt}`),
              })),
            ]}
          />
          <FilterSelect
            label={t("teacher_question_bank.filter_difficulty")}
            value={difficultyFilter}
            onChange={(v) =>
              setDifficultyFilter(v as InterviewDifficulty | "all")
            }
            options={[
              { value: "all", label: t("teacher_question_bank.all") },
              ...DIFFICULTIES.map((d) => ({
                value: d,
                label: t(`teacher_interview_config.qbank.difficulty.${d}`),
              })),
            ]}
          />
          {allTags.length > 0 && (
            <FilterSelect
              label={t("teacher_question_bank.filter_tag")}
              value={tagFilter}
              onChange={setTagFilter}
              options={[
                { value: "all", label: t("teacher_question_bank.all") },
                ...allTags.map((tag) => ({ value: tag, label: tag })),
              ]}
            />
          )}
        </div>
      )}

      {/* Count */}
      {hasItems && (
        <p className="text-xs text-m3-on-surface-variant">
          {anyFilterActive
            ? t("teacher_question_bank.showing_filtered", {
                shown: filtered.length,
                total: items?.length ?? 0,
              })
            : t("teacher_question_bank.showing_all", {
                count: items?.length ?? 0,
              })}
        </p>
      )}

      {/* Body */}
      {isLoading ? (
        <p className="text-sm text-m3-on-surface-variant">
          {t("common.loading")}
        </p>
      ) : !hasItems ? (
        <div className="rounded-xl border border-dashed border-m3-outline-variant/40 bg-m3-surface-container-lowest p-8 text-center space-y-2">
          <Library className="mx-auto h-8 w-8 text-m3-on-surface-variant/50" />
          <p className="text-sm font-bold text-m3-on-surface">
            {t("teacher_question_bank.empty_title")}
          </p>
          <p className="text-xs text-m3-on-surface-variant max-w-prose mx-auto">
            {t("teacher_question_bank.empty_body")}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low px-4 py-3 text-sm text-m3-on-surface-variant">
          {t("teacher_question_bank.empty_filtered")}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low overflow-hidden"
            >
              {editingId === item.id && draft ? (
                <ItemEditor
                  draft={draft}
                  setDraft={setDraft}
                  saving={savingId === item.id}
                  onCancel={cancelEdit}
                  onSave={() => void saveEdit()}
                />
              ) : (
                <div className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm text-m3-on-surface leading-relaxed">
                      {item.prompt_text}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {t(
                          `teacher_interview_config.qbank.type.${item.question_type}`,
                        )}
                      </Badge>
                      {item.difficulty && (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                            difficultyChipClass(item.difficulty),
                          )}
                        >
                          {t(
                            `teacher_interview_config.qbank.difficulty.${item.difficulty}`,
                          )}
                        </span>
                      )}
                      {(item.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 rounded-full bg-m3-surface px-1.5 py-0.5 text-[10px] text-m3-on-surface-variant border border-m3-outline-variant/30"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    {item.model_answer && (
                      <p className="text-xs text-m3-on-surface-variant border-t border-m3-outline-variant/10 pt-1.5 mt-1.5">
                        <span className="font-semibold">
                          {t("teacher_question_bank.model_answer")}:
                        </span>{" "}
                        {item.model_answer}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => beginEdit(item)}
                      className="gap-1.5"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        {t("common.edit")}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(item)}
                      className="gap-1.5 text-red-700 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-m3-surface p-5 space-y-4 shadow-xl">
            <div className="flex items-start gap-2">
              <TriangleAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-m3-on-surface">
                  {t("teacher_question_bank.delete_title")}
                </p>
                <p className="text-xs text-m3-on-surface-variant">
                  {t("teacher_question_bank.delete_body")}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deleteItem.isPending}
                onClick={() => setConfirmDelete(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-red-600 hover:bg-red-700"
                disabled={deleteItem.isPending}
                onClick={() => void doDelete(confirmDelete)}
              >
                {deleteItem.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline editor ─────────────────────────────────────────────────────────────

function ItemEditor({
  draft,
  setDraft,
  saving,
  onCancel,
  onSave,
}: {
  draft: EditorState;
  setDraft: (next: EditorState) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const [tagInput, setTagInput] = useState("");

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || draft.tags.includes(tag)) {
      setTagInput("");
      return;
    }
    setDraft({ ...draft, tags: [...draft.tags, tag] });
    setTagInput("");
  }
  function removeTag(tag: string) {
    setDraft({ ...draft, tags: draft.tags.filter((x) => x !== tag) });
  }

  return (
    <div className="p-3 space-y-3">
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-m3-on-surface-variant">
          {t("teacher_question_bank.prompt_label")}
        </label>
        <textarea
          value={draft.prompt_text}
          onChange={(e) => setDraft({ ...draft, prompt_text: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-m3-on-surface-variant">
            {t("teacher_question_bank.filter_type")}
          </label>
          <select
            value={draft.question_type}
            onChange={(e) =>
              setDraft({
                ...draft,
                question_type: e.target.value as InterviewQuestionType,
              })
            }
            className="block rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-2.5 py-1.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {QUESTION_TYPES.map((qt) => (
              <option key={qt} value={qt}>
                {t(`teacher_interview_config.qbank.type.${qt}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-m3-on-surface-variant">
            {t("teacher_question_bank.filter_difficulty")}
          </label>
          <select
            value={draft.difficulty}
            onChange={(e) =>
              setDraft({
                ...draft,
                difficulty: e.target.value as InterviewDifficulty | "none",
              })
            }
            className="block rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-2.5 py-1.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="none">
              {t("teacher_question_bank.no_difficulty")}
            </option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {t(`teacher_interview_config.qbank.difficulty.${d}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-m3-on-surface-variant">
          {t("teacher_question_bank.model_answer")}
        </label>
        <textarea
          value={draft.model_answer}
          onChange={(e) => setDraft({ ...draft, model_answer: e.target.value })}
          rows={2}
          className="w-full rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-3 py-2 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-m3-on-surface-variant">
          {t("teacher_question_bank.tags_label")}
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {draft.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-m3-primary-fixed px-2 py-0.5 text-[11px] text-m3-primary"
            >
              <Tag className="h-3 w-3" />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={t("teacher_question_bank.remove_tag", { tag })}
                className="hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="inline-flex items-center gap-1">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder={t("teacher_question_bank.add_tag_placeholder")}
              className="h-7 w-32 bg-m3-surface text-xs"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addTag}
              className="h-7 gap-1 px-2 text-xs"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          disabled={saving || !draft.prompt_text.trim()}
          onClick={onSave}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

// ── Filter primitive ──────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-m3-on-surface-variant">
      <span className="hidden sm:inline">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-lg border border-m3-outline-variant/30 bg-m3-surface px-2 py-1.5 text-sm text-m3-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

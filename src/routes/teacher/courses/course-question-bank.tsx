import { useMemo, useState, type CSSProperties } from "react";
import { useParams } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Info,
  Layers,
  Library,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedFilter } from "@/components/ui/segmented-filter";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

/**
 * Difficulty is an ORDERED scale, so the chips are one hue ramping in
 * saturation — three unrelated hues (teal / blue / purple) read as three
 * unrelated categories and hid the ordering.
 */
function difficultyChipClass(difficulty: InterviewDifficulty): string {
  switch (difficulty) {
    case "senior":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "mid_level":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "junior":
    default:
      return "bg-sky-50 text-sky-700 border-sky-200";
  }
}

/** Stagger step for the row entrance, capped so a long bank isn't slow. */
const STAGGER_MS = 45;
const STAGGER_CAP = 8;

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
  // Rows animate out before the mutation fires, so the list closes the gap
  // instead of a card blinking out of existence.
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  // The "how to add" copy is orientation for a first visit, not something a
  // returning teacher needs occupying a permanent band above their data.
  const [helpOpen, setHelpOpen] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(
    new Set(),
  );

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

  // Per-type counts drive the segmented filter badges: the teacher can see the
  // shape of the bank without applying a filter to find out.
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items ?? []) {
      counts.set(item.question_type, (counts.get(item.question_type) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const withAnswer = useMemo(
    () => (items ?? []).filter((i) => (i.model_answer ?? "").trim()).length,
    [items],
  );

  const anyFilterActive =
    search.trim() !== "" ||
    typeFilter !== "all" ||
    difficultyFilter !== "all" ||
    tagFilter !== "all";

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setDifficultyFilter("all");
    setTagFilter("all");
  }

  function toggleAnswer(id: string) {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
    setConfirmDelete(null);
    setDeletingIds((prev) => new Set(prev).add(item.id));
    // Let the exit transition play out before the row leaves the DOM.
    await new Promise((resolve) => setTimeout(resolve, 280));
    try {
      await deleteItem.mutateAsync(item.id);
      toast.success(t("teacher_question_bank.deleted"));
    } catch (err: unknown) {
      toast.error((err as Error).message);
      // Restore, or the row stays invisible-but-present forever.
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  const total = items?.length ?? 0;
  const hasItems = total > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-5">
      <PageHeader
        title={t("teacher_question_bank.title")}
        subtitle={
          course?.title
            ? t("teacher_question_bank.subtitle_course", {
                course: course.title,
              })
            : t("teacher_question_bank.subtitle")
        }
        action={
          <button
            type="button"
            onClick={() => setHelpOpen((open) => !open)}
            aria-expanded={helpOpen}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold",
              "transition-all duration-200 active:scale-[0.97]",
              helpOpen
                ? "bg-m3-primary-fixed text-m3-primary"
                : "text-m3-on-surface-variant hover:bg-m3-surface-container hover:text-m3-on-surface",
            )}
          >
            <Info className="h-3.5 w-3.5" />
            {t("teacher_question_bank.how_it_works")}
          </button>
        }
      />

      {/* Collapsible orientation copy. grid-rows technique: animates without
          reflowing siblings, no max-height hack. */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          helpOpen
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="rounded-xl border border-m3-primary/20 bg-m3-primary/[0.04] px-4 py-3 text-xs leading-relaxed text-m3-on-surface-variant">
            {t("teacher_question_bank.how_to_add")}
          </p>
        </div>
      </div>

      {/* Stat strip — the shape of the pool at a glance. Replaces a bare
          "{n} question(s)" line that carried no other signal. */}
      {hasItems && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile
            icon={Library}
            label={t("teacher_question_bank.stat_total")}
            value={total}
            index={0}
          />
          <StatTile
            icon={Layers}
            label={t("teacher_question_bank.stat_tags")}
            value={allTags.length}
            index={1}
          />
          <StatTile
            icon={Check}
            label={t("teacher_question_bank.stat_with_answer")}
            value={withAnswer}
            suffix={t("teacher_question_bank.stat_of_total", { total })}
            index={2}
          />
        </div>
      )}

      {/* Filters */}
      {hasItems && (
        <div className="space-y-2.5 rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-m3-on-surface-variant/60" />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("teacher_question_bank.search_placeholder")}
                aria-label={t("teacher_question_bank.search_placeholder")}
                className="pl-9"
              />
            </div>
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

          {/* Type moves from a dropdown to a segmented control: 5 fixed values
              with counts, which a <select> hides behind a click. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedFilter
              ariaLabel={t("teacher_question_bank.filter_type")}
              value={typeFilter}
              onChange={(v) =>
                setTypeFilter(v as InterviewQuestionType | "all")
              }
              options={[
                {
                  key: "all" as const,
                  label: t("teacher_question_bank.all"),
                  count: total,
                },
                ...QUESTION_TYPES.filter(
                  (qt) => (typeCounts.get(qt) ?? 0) > 0,
                ).map((qt) => ({
                  key: qt,
                  label: t(`teacher_interview_config.qbank.type.${qt}`),
                  count: typeCounts.get(qt) ?? 0,
                })),
              ]}
            />
            {anyFilterActive && (
              <button
                type="button"
                onClick={clearFilters}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
                  "text-m3-on-surface-variant transition-all duration-200",
                  "hover:bg-m3-surface-container hover:text-m3-primary active:scale-[0.97]",
                  "animate-[fade-in-up_0.2s_ease-out_both]",
                )}
              >
                <X className="h-3 w-3" />
                {t("teacher_question_bank.clear_filters")}
              </button>
            )}
          </div>

          {anyFilterActive && (
            <p className="text-[11px] text-m3-on-surface-variant tabular-nums">
              {t("teacher_question_bank.showing_filtered", {
                shown: filtered.length,
                total,
              })}
            </p>
          )}
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-[86px] animate-pulse rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low"
              style={{ animationDelay: `${i * 120}ms` } as CSSProperties}
            />
          ))}
        </ul>
      ) : !hasItems ? (
        <div className="animate-[fade-in-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both] rounded-2xl border border-dashed border-m3-outline-variant/50 bg-m3-surface-container-lowest p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-m3-primary-fixed">
            <Library className="h-7 w-7 text-m3-primary" />
          </div>
          <p className="mt-4 text-base font-bold text-m3-on-surface">
            {t("teacher_question_bank.empty_title")}
          </p>
          <p className="mx-auto mt-1.5 max-w-prose text-xs leading-relaxed text-m3-on-surface-variant">
            {t("teacher_question_bank.empty_body")}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="animate-[fade-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both] rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest p-8 text-center">
          <Search className="mx-auto h-6 w-6 text-m3-on-surface-variant/50" />
          <p className="mt-3 text-sm font-semibold text-m3-on-surface">
            {t("teacher_question_bank.empty_filtered")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            {t("teacher_question_bank.clear_filters")}
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item, i) => {
            const isEditing = editingId === item.id && draft;
            const isDeleting = deletingIds.has(item.id);
            const answerOpen = expandedAnswers.has(item.id);
            const hasAnswer = Boolean((item.model_answer ?? "").trim());
            return (
              // The entrance animation lives on an INNER wrapper, never on
              // this <li>. `fade-in-up ... both` keeps its final
              // `transform: translateY(0)` applied forever, which silently wins
              // over `hover:-translate-y-0.5` and over the delete slide-out —
              // verified in a browser: the lift measured as a no-op until the
              // animation was moved off the element that owns the transforms.
              <li
                key={item.id}
                className={cn(
                  "group origin-top overflow-hidden rounded-xl border bg-m3-surface-container-lowest",
                  "transition-all duration-300 ease-in",
                  isDeleting
                    ? "max-h-0 -translate-x-4 scale-95 border-transparent opacity-0 !my-0 !p-0"
                    : "max-h-[900px] border-m3-outline-variant/30",
                  // Hover lift only when not editing — a form that drifts under
                  // the cursor is worse than no affordance.
                  !isEditing &&
                    !isDeleting &&
                    "hover:-translate-y-0.5 hover:border-m3-primary/40 hover:shadow-editorial",
                )}
              >
                <div
                  className={
                    isDeleting
                      ? undefined
                      : "animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
                  }
                  style={
                    {
                      animationDelay: `${Math.min(i, STAGGER_CAP) * STAGGER_MS}ms`,
                    } as CSSProperties
                  }
                >
                  {isEditing ? (
                    <ItemEditor
                      draft={draft}
                      setDraft={setDraft}
                      saving={savingId === item.id}
                      onCancel={cancelEdit}
                      onSave={() => void saveEdit()}
                    />
                  ) : (
                    <div className="p-3.5">
                      <div className="flex items-start gap-3">
                        {/* Explicit gutter, not just a gap: the action column is
                          fixed-width, so cap the text block instead of letting
                          flex shrink decide how close the prompt gets to Edit. */}
                        <div className="min-w-0 flex-1 space-y-2 pr-4 sm:max-w-[calc(100%-9rem)]">
                          <p className="text-sm font-medium leading-relaxed text-m3-on-surface transition-colors group-hover:text-m3-primary">
                            {item.prompt_text}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="border-m3-outline-variant/60 text-[10px] font-semibold"
                            >
                              {t(
                                `teacher_interview_config.qbank.type.${item.question_type}`,
                              )}
                            </Badge>
                            {item.difficulty && (
                              <span
                                className={cn(
                                  // Same box as the type Badge (h-5 rounded-full
                                  // px-2) so the two read as peer attributes.
                                  "inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold",
                                  difficultyChipClass(item.difficulty),
                                )}
                              >
                                {t(
                                  `teacher_interview_config.qbank.difficulty.${item.difficulty}`,
                                )}
                              </span>
                            )}
                            {(item.tags ?? []).map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setTagFilter(tag)}
                                title={t(
                                  "teacher_question_bank.filter_by_tag",
                                  {
                                    tag,
                                  },
                                )}
                                className={cn(
                                  "inline-flex h-5 cursor-pointer items-center gap-1 rounded-full border px-2 text-[10px] leading-none",
                                  "transition-all duration-150 active:scale-95",
                                  tagFilter === tag
                                    ? "border-m3-primary/40 bg-m3-primary-fixed text-m3-primary"
                                    : "border-m3-outline-variant/40 bg-m3-surface text-m3-on-surface-variant hover:border-m3-primary/40 hover:text-m3-primary",
                                )}
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Actions fade up to full strength on row hover so a long
                          list isn't a wall of icons, but stay reachable by
                          keyboard (focus-within) and always visible on touch. */}
                        <div
                          className={cn(
                            "flex shrink-0 items-center gap-1 transition-opacity duration-200",
                            "opacity-100 sm:opacity-60",
                            "group-hover:opacity-100 group-focus-within:opacity-100",
                          )}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => beginEdit(item)}
                            className="gap-1.5 transition-transform duration-150 hover:-translate-y-px active:scale-95"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">
                              {t("common.edit")}
                            </span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("common.delete")}
                            onClick={() => setConfirmDelete(item)}
                            className="text-red-700 transition-transform duration-150 hover:-translate-y-px hover:bg-red-50 hover:text-red-700 active:scale-95"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Model answer was inlined in full, so one long answer
                        pushed every other question off screen. Collapsed by
                        default, same grid-rows animation as the help panel. */}
                      {hasAnswer && (
                        <div className="mt-1.5">
                          <button
                            type="button"
                            onClick={() => toggleAnswer(item.id)}
                            aria-expanded={answerOpen}
                            className={cn(
                              // Deliberately lighter than the prompt above it —
                              // a disclosure control must not outweigh the
                              // content it belongs to.
                              "-ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-[11px]",
                              "text-m3-on-surface-variant transition-colors hover:text-m3-primary",
                            )}
                          >
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 transition-transform duration-300",
                                answerOpen && "rotate-180",
                              )}
                            />
                            {t("teacher_question_bank.model_answer")}
                          </button>
                          <div
                            className={cn(
                              "grid transition-all duration-300 ease-in-out",
                              answerOpen
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0",
                            )}
                          >
                            <div className="overflow-hidden">
                              <p className="mt-1.5 rounded-lg bg-m3-surface-container-low px-3 py-2 text-xs leading-relaxed text-m3-on-surface-variant">
                                {item.model_answer}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title={t("teacher_question_bank.delete_title")}
        description={t("teacher_question_bank.delete_body")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        isPending={deleteItem.isPending}
        onConfirm={() => {
          if (confirmDelete) void doDelete(confirmDelete);
        }}
      />
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
  index,
}: {
  icon: typeof Library;
  label: string;
  value: string | number;
  /** Muted trailing text (e.g. "of 6") so the value itself stays one token. */
  suffix?: string;
  index: number;
}) {
  return (
    // Entrance animation on the outer element, hover lift on the inner one —
    // `both` fill-mode would otherwise pin transform and cancel the lift.
    <div
      className="animate-[fade-in-up_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
      style={{ animationDelay: `${index * 60}ms` } as CSSProperties}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-m3-outline-variant/30 bg-m3-surface-container-lowest px-3 py-2.5",
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-m3-primary/40 hover:shadow-editorial",
        )}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-m3-primary-fixed text-m3-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {label}
          </span>
          {/* key on the value: cross-fades when a filter/delete changes it. */}
          <span
            key={String(value)}
            className="block animate-[fade-in-up_0.25s_ease-out_both] text-sm font-extrabold tabular-nums text-m3-on-surface"
          >
            {value}
            {suffix && (
              <span className="ml-1 text-[11px] font-semibold text-m3-on-surface-variant">
                {suffix}
              </span>
            )}
          </span>
        </span>
      </div>
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
    <div className="animate-[fade-in-up_0.25s_ease-out_both] space-y-3 border-l-2 border-m3-primary bg-m3-primary/[0.02] p-3.5">
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_question_bank.prompt_label")}
        </label>
        <Textarea
          value={draft.prompt_text}
          onChange={(e) => setDraft({ ...draft, prompt_text: e.target.value })}
          rows={2}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_question_bank.filter_type")}
          </label>
          <Select<InterviewQuestionType>
            value={draft.question_type}
            onValueChange={(next) =>
              setDraft({
                ...draft,
                question_type: next,
              })
            }
            options={QUESTION_TYPES.map((qt) => ({
              value: qt,
              label: t(`teacher_interview_config.qbank.type.${qt}`),
            }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
            {t("teacher_question_bank.filter_difficulty")}
          </label>
          <Select<InterviewDifficulty | "none">
            value={draft.difficulty}
            onValueChange={(next) =>
              setDraft({
                ...draft,
                difficulty: next,
              })
            }
            options={[
              {
                value: "none",
                label: t("teacher_question_bank.no_difficulty"),
              },
              ...DIFFICULTIES.map((d) => ({
                value: d,
                label: t(`teacher_interview_config.qbank.difficulty.${d}`),
              })),
            ]}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_question_bank.model_answer")}
        </label>
        <Textarea
          value={draft.model_answer}
          onChange={(e) => setDraft({ ...draft, model_answer: e.target.value })}
          rows={3}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-m3-on-surface-variant">
          {t("teacher_question_bank.tags_label")}
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {draft.tags.map((tag) => (
            <span
              key={tag}
              // h-7 matches the `sm` Input beside it so the row's top/bottom
              // edges are flush.
              className="inline-flex h-7 animate-[scale-in_0.2s_ease-out_both] items-center gap-1 rounded-full bg-m3-primary-fixed px-2.5 text-[11px] font-semibold text-m3-primary"
            >
              <Tag className="h-3 w-3" />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={t("teacher_question_bank.remove_tag", { tag })}
                className="cursor-pointer rounded-full p-0.5 transition-colors hover:bg-red-100 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <div className="inline-flex items-center gap-1">
            <Input
              size="sm"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder={t("teacher_question_bank.add_tag_placeholder")}
              className="w-32"
            />
            {/* Kept alongside Enter-to-commit: on a touch keyboard Enter is
                not always reachable, and the field gives no other hint that it
                commits. Disabled until there is something to add so it can't
                read as a no-op. */}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("teacher_question_bank.add_tag")}
              title={t("teacher_question_bank.add_tag")}
              onClick={addTag}
              disabled={!tagInput.trim()}
              className="transition-transform duration-150 active:scale-90"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-m3-outline-variant/20 pt-2.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={saving}
          onClick={onCancel}
          className="gap-1.5 transition-transform duration-150 active:scale-95"
        >
          <X className="h-4 w-4" />
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 transition-transform duration-150 hover:-translate-y-px active:scale-95"
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
      <span className="hidden font-semibold sm:inline">{label}</span>
      <Select
        value={value}
        onValueChange={(next) => onChange(next)}
        aria-label={label}
        size="sm"
        // Fixed identical width for every filter select: unequal widths in one
        // control row read as a bug, and the label text length varies.
        className="w-[8.5rem]"
        options={options}
      />
    </label>
  );
}

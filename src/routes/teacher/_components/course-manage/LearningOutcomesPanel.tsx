import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Loader2,
  Check,
  Pencil,
  ListChecks,
  CornerDownRight,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { useTeacherCourseById } from "@/lib/api/hooks/teacher-courses";
import {
  useTeacherCourseOutcomes,
  useCreateCourseOutcome,
  useUpdateCourseOutcome,
  useDeleteCourseOutcome,
} from "@/lib/api/hooks/courses";
import { cn } from "@/lib/utils";

/**
 * Collapsible "Learning Outcomes" panel: a nestable (parent/child) list of
 * outcome statements with inline add/edit/delete. Editing is only permitted
 * while the course is an unpublished draft — once published the outcomes are
 * frozen (they double as the graded assessment scale, enforced server-side).
 */
export function LearningOutcomesPanel({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const { data: course } = useTeacherCourseById(courseId);
  const { data: outcomes = [] } = useTeacherCourseOutcomes(courseId);
  const createOutcome = useCreateCourseOutcome(courseId);
  const updateOutcome = useUpdateCourseOutcome(courseId);
  const deleteOutcome = useDeleteCourseOutcome(courseId);

  // Learning outcomes are editable only while the course is an unpublished
  // draft — once published they're frozen (they double as the graded
  // assessment scale). The backend enforces this with 409; here we hide the
  // add/edit/delete affordances so the read-only state is obvious.
  const editable = (course?.status ?? "draft") === "draft";

  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Inline "add child" state: the parent whose child-input is open + its text.
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
  const [childText, setChildText] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;
    try {
      await createOutcome.mutateAsync({ outcome_text: text });
      setNewText("");
      toast.success(t("teacher_outcomes.added", "Learning outcome added"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.add_failed", "Failed to add outcome"),
      );
    }
  }

  function startAddChild(parentId: string) {
    setAddChildParentId(parentId);
    setChildText("");
  }
  function cancelAddChild() {
    setAddChildParentId(null);
    setChildText("");
  }
  async function handleAddChild(parentId: string) {
    const text = childText.trim();
    if (!text) return;
    try {
      await createOutcome.mutateAsync({
        outcome_text: text,
        parent_id: parentId,
      });
      cancelAddChild();
      toast.success(t("teacher_outcomes.child_added", "Sub-outcome added"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.add_failed", "Failed to add outcome"),
      );
    }
  }

  function startEdit(id: string, text: string) {
    setEditingId(id);
    setEditText(text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function handleSaveEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    try {
      await updateOutcome.mutateAsync({ outcomeId: id, outcome_text: text });
      cancelEdit();
      toast.success(t("teacher_outcomes.updated", "Learning outcome updated"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.update_failed", "Failed to update outcome"),
      );
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteOutcome.mutateAsync(id);
      setPendingDeleteId(null);
      toast.success(t("teacher_outcomes.deleted", "Learning outcome deleted"));
    } catch (err: unknown) {
      toast.error(
        (err as Error).message ||
          t("teacher_outcomes.delete_failed", "Failed to delete outcome"),
      );
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-l-4 border-m3-outline-variant/20 overflow-hidden transition-colors",
        open ? "border-l-m3-primary" : "border-l-m3-outline-variant",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer transition-colors",
          open
            ? "bg-m3-surface-container-low hover:bg-m3-surface-container"
            : "hover:bg-m3-primary/5",
        )}
      >
        <ListChecks className="h-4 w-4 text-m3-secondary shrink-0" />
        <span className="flex-1 text-sm font-bold text-m3-on-surface transition-colors group-hover:text-m3-primary">
          {t("teacher_outcomes.title", "Learning Outcomes")}
        </span>
        <span className="text-xs text-m3-on-surface-variant mr-2 hidden sm:block">
          {t("teacher_outcomes.count", "{{count}} defined", {
            count: outcomes.length,
          })}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-m3-on-surface-variant transition-transform duration-300",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden min-h-0">
          <div className="p-5 border-t border-m3-outline-variant/10 bg-m3-surface space-y-4">
            {outcomes.length === 0 ? (
              <p className="text-sm text-m3-on-surface-variant">
                {t(
                  "teacher_outcomes.empty",
                  "No learning outcomes yet. Add one to describe what students will achieve.",
                )}
              </p>
            ) : (
              <ul className="space-y-2">
                {outcomes.map((outcome) => {
                  // Dotted hierarchy code is derived server-side (e.g. "1.2.1"
                  // → "L.O.1.2.1"); depth drives left indentation so the tree
                  // reads as nested. Fallback to position if code is absent.
                  const depth = outcome.depth ?? 0;
                  const code = t("teacher_outcomes.code", "L.O.{{n}}", {
                    n: outcome.code ?? outcome.position,
                  });
                  const isEditing = editingId === outcome.id;
                  const isAddingChild = addChildParentId === outcome.id;
                  return (
                    <li
                      key={outcome.id}
                      className="flex flex-col gap-2 rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-lowest px-3 py-2.5"
                      style={{ marginLeft: `${depth * 1.5}rem` }}
                    >
                      <div className="flex items-start gap-3">
                        <Badge className="mt-0.5 shrink-0 bg-violet-100 text-violet-700 border-transparent">
                          {code}
                        </Badge>
                        {isEditing ? (
                          <>
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  void handleSaveEdit(outcome.id);
                                } else if (e.key === "Escape") {
                                  cancelEdit();
                                }
                              }}
                              autoFocus
                              className="h-9 flex-1"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                disabled={
                                  updateOutcome.isPending || !editText.trim()
                                }
                                onClick={() => void handleSaveEdit(outcome.id)}
                                aria-label={t("teacher_outcomes.save", "Save")}
                              >
                                {updateOutcome.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 text-m3-primary" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                aria-label={t(
                                  "teacher_outcomes.cancel",
                                  "Cancel",
                                )}
                              >
                                <X className="h-4 w-4 text-m3-on-surface-variant" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-m3-on-surface leading-relaxed">
                              {outcome.outcome_text}
                            </span>
                            {editable && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() =>
                                    startEdit(outcome.id, outcome.outcome_text)
                                  }
                                  aria-label={t(
                                    "teacher_outcomes.edit",
                                    "Edit",
                                  )}
                                >
                                  <Pencil className="h-4 w-4 text-m3-on-surface-variant" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => startAddChild(outcome.id)}
                                  aria-label={t(
                                    "teacher_outcomes.add_child",
                                    "Add sub-outcome",
                                  )}
                                  title={t(
                                    "teacher_outcomes.add_child",
                                    "Add sub-outcome",
                                  )}
                                >
                                  <CornerDownRight className="h-4 w-4 text-m3-on-surface-variant" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  onClick={() => setPendingDeleteId(outcome.id)}
                                  aria-label={t(
                                    "teacher_outcomes.delete",
                                    "Delete",
                                  )}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Inline sub-outcome input — nests a child under this
                          outcome (parent_id). Enter submits, Escape cancels. */}
                      {isAddingChild && (
                        <div className="flex items-center gap-2 pl-6">
                          <CornerDownRight className="h-4 w-4 text-m3-on-surface-variant shrink-0" />
                          <Input
                            value={childText}
                            onChange={(e) => setChildText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleAddChild(outcome.id);
                              } else if (e.key === "Escape") {
                                cancelAddChild();
                              }
                            }}
                            autoFocus
                            placeholder={t(
                              "teacher_outcomes.add_child_placeholder",
                              "Sub-outcome statement…",
                            )}
                            className="h-9 flex-1"
                          />
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={
                              createOutcome.isPending || !childText.trim()
                            }
                            onClick={() => void handleAddChild(outcome.id)}
                            aria-label={t("teacher_outcomes.save", "Save")}
                          >
                            {createOutcome.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-m3-primary" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            onClick={cancelAddChild}
                            aria-label={t("teacher_outcomes.cancel", "Cancel")}
                          >
                            <X className="h-4 w-4 text-m3-on-surface-variant" />
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {editable && (
              <form
                onSubmit={handleAdd}
                className="flex items-center gap-2 pt-1"
              >
                <Input
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder={t(
                    "teacher_outcomes.add_placeholder",
                    "e.g. Explain the core principles of…",
                  )}
                  className="h-9 flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={createOutcome.isPending || !newText.trim()}
                  className="gap-2 shrink-0"
                >
                  {createOutcome.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {t("teacher_outcomes.add", "Add outcome")}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      <PromptDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
        title={t("teacher_outcomes.delete_title", "Delete learning outcome?")}
        description={t(
          "teacher_outcomes.delete_description",
          "The remaining outcomes will be renumbered automatically.",
        )}
        confirmLabel={t("teacher_outcomes.delete", "Delete")}
        isPending={deleteOutcome.isPending}
        onConfirm={() => {
          if (pendingDeleteId) void handleDelete(pendingDeleteId);
        }}
      />
    </div>
  );
}

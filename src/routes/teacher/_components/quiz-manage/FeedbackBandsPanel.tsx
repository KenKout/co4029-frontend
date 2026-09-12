import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import {
  useFeedbackBands,
  useSetFeedbackBands,
  type FeedbackBandIn,
} from "@/lib/api/hooks/quizzes";
import { FeedbackBandRow } from "./FeedbackBandRow";

/**
 * Phase 8 — grade-band feedback editor. A teacher defines score ranges that map
 * to feedback shown to the student after submit. Wholesale-replace on save
 * (mirrors the backend PUT). Client-side validation (min < max, no overlap)
 * mirrors the server so overlaps surface before the 422 backstop.
 */
export function FeedbackBandsPanel({ quizId, locked = false, onDirtyChange }: { quizId: string; locked?: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const { t } = useTranslation();
  const { data: bands, isLoading, isError, refetch } = useFeedbackBands(quizId);
  const { confirm, dialog } = useConfirm();
  const save = useSetFeedbackBands(quizId);
  const [draft, setDraft] = useState<FeedbackBandIn[]>([]);
  const [baseline, setBaseline] = useState<FeedbackBandIn[]>([]);
  const baselineRef = useRef<FeedbackBandIn[]>([]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => { onDirtyChange?.(dirty || save.isPending); }, [dirty, save.isPending, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  useEffect(() => {
    if (bands) {
      const next = bands.map((b) => ({
          min_grade: b.min_grade,
          max_grade: b.max_grade,
          feedback_text: b.feedback_text,
          feedback_format: b.feedback_format ?? "markdown",
        }));
      const previous = baselineRef.current;
      setDraft((current) => JSON.stringify(current) === JSON.stringify(previous) ? next : current);
      baselineRef.current = next;
      setBaseline(next);
    }
  }, [bands]);

  function updateBand(i: number, patch: Partial<FeedbackBandIn>) {
    setDraft((cur) =>
      cur.map((b, idx) => (idx === i ? { ...b, ...patch } : b)),
    );
  }

  function addBand() {
    setDraft((cur) => [
      ...cur,
      {
        min_grade: 0,
        max_grade: 100,
        feedback_text: "",
        feedback_format: "markdown",
      },
    ]);
  }

  function removeBand(i: number) {
    setDraft((cur) => cur.filter((_, idx) => idx !== i));
  }

  /** Return an error key if the bands are invalid, else null. */
  function validate(): string | null {
    for (const b of draft) {
      // "invalid" is the locale key that exists ("Each band needs min < max");
      // "invalid_range" resolved to nothing, so this toast printed its own key path.
      if (Number(b.min_grade) >= Number(b.max_grade)) return "invalid";
    }
    const sorted = [...draft].sort((a, b) => a.min_grade - b.min_grade);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min_grade < sorted[i - 1].max_grade) return "overlap";
    }
    return null;
  }

  async function handleSave() {
    if (locked || save.isPending || !dirty) return;
    const err = validate();
    if (err) {
      toast.error(t(`teacher_quiz_manage.feedback_bands.${err}`));
      return;
    }
    if (!(await confirm({ title: t("teacher_quiz_manage.feedback_bands.save"), description: t("teacher_quiz_manage.settings.assist.feedback_confirm"), confirmLabel: t("teacher_quiz_manage.feedback_bands.save"), cancelLabel: t("common.cancel"), confirmVariant: "default" }))) return;
    try {
      await save.mutateAsync(
        draft.map((b) => ({
          min_grade: Number(b.min_grade),
          max_grade: Number(b.max_grade),
          feedback_text: b.feedback_text,
          feedback_format: b.feedback_format ?? "markdown",
        })),
      );
      toast.success(t("teacher_quiz_manage.feedback_bands.saved"));
    } catch {
      toast.error(t("teacher_quiz_manage.feedback_bands.save_failed"));
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-m3-secondary" />
      </div>
    );
  }
  if (isError) return <div role="alert" className="space-y-2"><p>{t("teacher_quiz_manage.settings.assist.load_failed")}</p><Button type="button" variant="outline" onClick={() => void refetch()}>{t("teacher_quiz_manage.settings.assist.retry")}</Button></div>;

  return (
    <form onSubmit={(event) => { event.preventDefault(); void handleSave(); }} className="space-y-3">
      <fieldset disabled={locked || save.isPending} className="border-0 p-0 min-w-0 space-y-3">
      {draft.length === 0 && (
        <p className="text-sm text-m3-on-surface-variant">
          {t("teacher_quiz_manage.feedback_bands.empty")}
        </p>
      )}
      {draft.map((band, i) => (
        <FeedbackBandRow
          key={i}
          band={band}
          onUpdate={(patch) => updateBand(i, patch)}
          onRemove={() => removeBand(i)}
        />
      ))}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBand}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          {t("teacher_quiz_manage.feedback_bands.add")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={save.isPending || !dirty}
          className="gap-1.5"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("teacher_quiz_manage.feedback_bands.save")}
        </Button>
        {dirty && <Button type="button" variant="ghost" onClick={() => {
          void confirm({ title: t("common.unsaved.title"), description: t("common.unsaved.description"), confirmLabel: t("teacher_quiz_manage.settings.reset_button"), cancelLabel: t("common.cancel") }).then((ok) => { if (ok) setDraft(baseline); });
        }}>{t("teacher_quiz_manage.settings.reset_button")}</Button>}
      </div>
      {dirty && <p role="status" className="text-xs text-m3-primary">{t("teacher_quiz_manage.settings.unsaved_changes")}</p>}
      </fieldset>
      {dialog}
    </form>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useFeedbackBands,
  useSetFeedbackBands,
  type FeedbackBandIn,
} from "@/lib/api/hooks/quizzes";

/**
 * Phase 8 — grade-band feedback editor. A teacher defines score ranges that map
 * to feedback shown to the student after submit. Wholesale-replace on save
 * (mirrors the backend PUT). Client-side validation (min < max, no overlap)
 * mirrors the server so overlaps surface before the 422 backstop.
 */
export function FeedbackBandsPanel({ quizId }: { quizId: string }) {
  const { t } = useTranslation();
  const { data: bands, isLoading } = useFeedbackBands(quizId);
  const save = useSetFeedbackBands(quizId);
  const [draft, setDraft] = useState<FeedbackBandIn[]>([]);

  useEffect(() => {
    if (bands) {
      setDraft(
        bands.map((b) => ({
          min_grade: b.min_grade,
          max_grade: b.max_grade,
          feedback_text: b.feedback_text,
          feedback_format: b.feedback_format ?? "markdown",
        })),
      );
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
      if (Number(b.min_grade) >= Number(b.max_grade)) return "invalid_range";
    }
    const sorted = [...draft].sort((a, b) => a.min_grade - b.min_grade);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min_grade < sorted[i - 1].max_grade) return "overlap";
    }
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      toast.error(t(`teacher_quiz_manage.feedback_bands.${err}`));
      return;
    }
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

  return (
    <div className="space-y-3">
      {draft.length === 0 && (
        <p className="text-sm text-m3-on-surface-variant">
          {t("teacher_quiz_manage.feedback_bands.empty")}
        </p>
      )}
      {draft.map((band, i) => (
        <div
          key={i}
          className="grid gap-2 sm:grid-cols-[5rem_5rem_1fr_auto] items-start rounded-lg border border-m3-outline-variant/20 p-3"
        >
          <Input
            type="number"
            min={0}
            max={100}
            value={String(band.min_grade)}
            onChange={(e) =>
              updateBand(i, { min_grade: Number(e.target.value) })
            }
            className="bg-m3-surface text-sm"
            aria-label={t("teacher_quiz_manage.feedback_bands.min")}
          />
          <Input
            type="number"
            min={0}
            max={100}
            value={String(band.max_grade)}
            onChange={(e) =>
              updateBand(i, { max_grade: Number(e.target.value) })
            }
            className="bg-m3-surface text-sm"
            aria-label={t("teacher_quiz_manage.feedback_bands.max")}
          />
          <textarea
            value={band.feedback_text}
            onChange={(e) => updateBand(i, { feedback_text: e.target.value })}
            rows={2}
            placeholder={t(
              "teacher_quiz_manage.feedback_bands.text_placeholder",
            )}
            className="w-full rounded-lg border border-m3-outline-variant/20 bg-m3-surface px-3 py-2 text-sm resize-none"
          />
          <button
            type="button"
            onClick={() => removeBand(i)}
            className="p-2 text-m3-on-surface-variant hover:text-red-600"
            aria-label={t("teacher_quiz_manage.feedback_bands.remove")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={save.isPending}
          className="gap-1.5"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("teacher_quiz_manage.feedback_bands.save")}
        </Button>
      </div>
    </div>
  );
}

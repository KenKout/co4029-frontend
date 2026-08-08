import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { FeedbackBandIn } from "@/lib/api/hooks/quizzes";
import { Button } from "@/components/ui/button";

/**
 * One grade band row: min / max score, the feedback body, and a remove action.
 * Extracted from FeedbackBandsPanel verbatim.
 */
export function FeedbackBandRow({
  band,
  onUpdate,
  onRemove,
}: {
  band: FeedbackBandIn;
  onUpdate: (patch: Partial<FeedbackBandIn>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2 sm:grid-cols-[5rem_5rem_1fr_auto] items-start rounded-lg border border-m3-outline-variant/20 p-3">
      <Input
        type="number"
        min={0}
        max={100}
        value={String(band.min_grade)}
        onChange={(e) => onUpdate({ min_grade: Number(e.target.value) })}
        aria-label={t("teacher_quiz_manage.feedback_bands.min")}
      />
      <Input
        type="number"
        min={0}
        max={100}
        value={String(band.max_grade)}
        onChange={(e) => onUpdate({ max_grade: Number(e.target.value) })}
        aria-label={t("teacher_quiz_manage.feedback_bands.max")}
      />
      <textarea
        value={band.feedback_text}
        onChange={(e) => onUpdate({ feedback_text: e.target.value })}
        rows={2}
        placeholder={t("teacher_quiz_manage.feedback_bands.text_placeholder")}
        className="w-full rounded-lg border border-m3-outline-variant/20 bg-m3-surface px-3 py-2 text-sm resize-none"
      />
      <Button variant="ghost"
        type="button"
        onClick={onRemove}
        className="p-2 text-m3-on-surface-variant hover:text-red-600"
        aria-label={t("teacher_quiz_manage.feedback_bands.remove")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

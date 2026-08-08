import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Add-manual inline form. Extracted verbatim from the former 2.4k-line
 * question-bank.tsx.
 *
 * `pending` is the combined create + duplicate-check in-flight state: it both
 * disables the save button and shows the spinner, exactly as before.
 */
export function AddQuestionForm({
  newText,
  newAnswer,
  pending,
  onChangeText,
  onChangeAnswer,
  onCancel,
  onSubmit,
}: {
  newText: string;
  newAnswer: string;
  pending: boolean;
  onChangeText: (v: string) => void;
  onChangeAnswer: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-m3-outline-variant/20 bg-m3-surface-container-low p-3 space-y-2">
      <Textarea
        value={newText}
        onChange={(e) => onChangeText(e.target.value)}
        rows={3}
        placeholder={t("teacher_interview_config.questions.add_placeholder")}
        className="border-m3-outline-variant/20"
      />
      <Textarea
        value={newAnswer}
        onChange={(e) => onChangeAnswer(e.target.value)}
        rows={3}
        placeholder={t(
          "teacher_interview_config.questions.add_answer_placeholder",
        )}
        className="border-dashed border-m3-secondary/30 bg-m3-secondary/[0.03]"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          disabled={pending || !newText.trim()}
          onClick={onSubmit}
          className="gap-2"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("teacher_interview_config.questions.add_save")}
        </Button>
      </div>
    </div>
  );
}

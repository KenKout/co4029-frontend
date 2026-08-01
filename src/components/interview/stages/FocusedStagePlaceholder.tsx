import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

/**
 * Placeholder for the QuestionCard that is about to replace it. The min-height
 * approximates a loaded card (eyebrow + two lines + action row) so the swap does
 * not jump; without it this card was roughly half the height of its replacement
 * and the whole stage lurched.
 */
export function FocusedStagePlaceholder() {
  const { t } = useTranslation();

  return (
    <section
      className="flex min-h-[188px] flex-col items-center justify-center rounded-2xl border border-border bg-white px-6 py-12 text-center shadow-editorial sm:min-h-[212px]"
      role="status"
    >
      <Loader2 className="mb-4 h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-text-muted">
        {t("course_interview.workspace.preparing_question")}
      </p>
    </section>
  );
}

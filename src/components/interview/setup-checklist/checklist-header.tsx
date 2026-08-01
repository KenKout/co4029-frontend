import { ShieldCheck, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ChecklistHeader() {
  const { t } = useTranslation();
  return (
    <div className="mb-5 text-center">
      {/* Module-context eyebrow — consistency with the lobby / results / quiz
          screens so the setup step reads as the same calm family (#15). */}
      <div className="mb-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-m3-secondary">
        <Sparkles className="h-3.5 w-3.5" />
        <span>{t("course_interview.setup.eyebrow")}</span>
      </div>
      <span className="mb-3 inline-flex size-12 items-center justify-center rounded-full border border-primary/15 bg-primary-soft text-primary">
        <ShieldCheck className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2
        id="setup-checklist-title"
        className="text-xl font-semibold tracking-[-0.01em] text-text-strong"
      >
        {t("course_interview.setup.title")}
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        {t("course_interview.setup.subtitle")}
      </p>
    </div>
  );
}

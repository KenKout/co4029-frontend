import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * The "how to add" orientation copy, extracted verbatim from the former
 * 843-line course-question-bank.tsx.
 */
export function HelpPanel({ helpOpen }: { helpOpen: boolean }) {
  const { t } = useTranslation();
  return (
    // Collapsible orientation copy. grid-rows technique: animates without
    // reflowing siblings, no max-height hack.
    <div
      className={cn(
        "grid transition-all duration-300 ease-in-out",
        helpOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <p className="rounded-xl border border-m3-primary/20 bg-m3-primary/[0.04] px-4 py-3 text-xs leading-relaxed text-m3-on-surface-variant">
          {t("teacher_question_bank.how_to_add")}
        </p>
      </div>
    </div>
  );
}

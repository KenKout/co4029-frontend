import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * A row's collapsible model answer, extracted verbatim from the former 843-line
 * course-question-bank.tsx.
 */
export function QuestionModelAnswer({
  item,
  answerOpen,
  onToggle,
}: {
  item: InterviewQuestionBankItemRead;
  answerOpen: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={onToggle}
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
  );
}

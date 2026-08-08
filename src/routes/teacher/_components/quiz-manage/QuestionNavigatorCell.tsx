import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, Pencil } from "lucide-react";

import type { QuizQuestionAuthoring } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buildNavStatusWords } from "./question-nav-status";
import type { NavCellStatus } from "./question-nav-status";

/**
 * One numbered cell of the question navigator — reuses the student
 * QuizSummaryCard box design. Extracted from QuestionNavigator verbatim; the
 * six status layers arrive pre-derived so this file is purely the projection.
 */
export function QuestionNavigatorCell({
  question,
  index,
  status,
  onSelect,
}: {
  question: QuizQuestionAuthoring;
  index: number;
  status: NavCellStatus;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const { focused, approved, unsaved, error, selected, pending, fill, ring } =
    status;
  const statusWords = buildNavStatusWords(status, t);

  return (
    <Button variant="ghost"
      type="button"
      onClick={onSelect}
      aria-current={focused ? "location" : undefined}
      aria-label={`${index + 1}. ${statusWords.join(", ")}`}
      title={`${index + 1}. ${statusWords.join(" · ")}${
        question.prompt_text ? `\n${question.prompt_text}` : ""
      }`}
      className={cn(
        "aspect-square w-full flex items-center justify-center rounded-lg font-bold text-sm relative cursor-pointer",
        "transition-all duration-150",
        fill,
        ring,
      )}
    >
      {index + 1}

      {/* PENDING — amber dot, top-right. Only when there's no error
          (an error cell is already fully red; a dot would be noise). */}
      {pending && (
        <span
          className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"
          aria-hidden="true"
        />
      )}

      {/* ERROR — warning glyph, top-right, on top of the red fill. */}
      {error && (
        <AlertTriangle
          className="absolute top-0 right-0 h-2.5 w-2.5"
          aria-hidden="true"
        />
      )}

      {/* UNSAVED — pencil, bottom-right. Pairs with the amber ring so
          the state reads even for colour-blind users. */}
      {unsaved && (
        <Pencil
          className={cn(
            "absolute bottom-0 right-0 h-2 w-2",
            error || approved ? "text-white" : "text-amber-600",
          )}
          aria-hidden="true"
        />
      )}

      {/* SELECTED — tick badge, top-left. Distinct corner from every
          other marker so bulk-selection never collides with status. */}
      {selected && (
        <span
          className="absolute -top-1 -left-1 flex h-3 w-3 items-center justify-center rounded-full bg-m3-secondary text-white shadow-sm"
          aria-hidden="true"
        >
          <Check className="h-2 w-2" strokeWidth={4} />
        </span>
      )}
    </Button>
  );
}

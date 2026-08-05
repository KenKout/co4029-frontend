import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, RefreshCw, Users } from "lucide-react";

import {
  useCardStudentResults,
  type DifficultCardWithPrompt,
} from "@/lib/api/hooks/spaced-repetition";
import { cn } from "@/lib/utils";

import { CardStudentResultsPanel } from "./CardStudentResultsPanel";
import { efMeta } from "./helpers";

/** One difficult-question row; expands to a per-student results panel. */
export function DifficultCardRow({
  card,
  courseId,
}: {
  card: DifficultCardWithPrompt;
  courseId: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Fetch per-student results lazily — only once the row is first expanded.
  const { data: results, isLoading } = useCardStudentResults(
    courseId,
    card.question_id,
    open,
  );
  const meta = efMeta(card.mean_ef);
  const difficultyLabel = t(meta.labelKey);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
        className="grid sm:grid-cols-[24px_1fr_150px_110px_140px] gap-4 px-6 py-3 items-center hover:bg-m3-surface-container-low transition-colors cursor-pointer"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 text-m3-on-surface-variant transition-transform shrink-0",
            open && "rotate-90",
          )}
        />
        <p
          className="text-sm text-m3-on-surface truncate"
          title={card.prompt_text}
        >
          {card.prompt_text || t("teacher_sr_cohort.untitled_question")}
        </p>
        <span
          className={cn(
            "text-xs font-bold px-2.5 py-1 rounded-full border w-fit inline-flex items-center gap-1.5",
            meta.cls,
          )}
          // Raw EF stays accessible to teachers who understand SM-2, but the
          // badge itself shows only the plain-language label — a bare EF
          // number means nothing to a teacher who doesn't know the algorithm
          // (see sr-cohort ef_hint).
          title={`${t("teacher_sr_cohort.ef_hint")} · EF ${card.mean_ef.toFixed(2)}`}
        >
          {difficultyLabel}
        </span>
        <span className="text-sm text-m3-on-surface-variant inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {card.student_count}
        </span>
        <Link
          to="/teacher/courses/$courseId/quizzes/$quizId"
          params={{ courseId, quizId: card.quiz_id }}
          search={{ question: card.question_id }}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-end gap-1.5 text-xs font-semibold text-m3-primary hover:underline cursor-pointer"
        >
          <RefreshCw className="h-3 w-3" />
          {t("teacher_sr_cohort.regenerate_question")}
        </Link>
      </div>

      {open && (
        <div className="px-6 pb-4 pt-1 bg-m3-surface-container-lowest">
          <CardStudentResultsPanel results={results} loading={isLoading} />
        </div>
      )}
    </div>
  );
}

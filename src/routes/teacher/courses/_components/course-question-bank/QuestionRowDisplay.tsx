import type { InterviewQuestionBankItemRead } from "@/lib/api/types";
import { QuestionModelAnswer } from "./QuestionModelAnswer";
import { QuestionRowActions } from "./QuestionRowActions";
import { QuestionRowMeta } from "./QuestionRowMeta";
import type { QuestionRowControllers } from "./QuestionList";

/**
 * A bank row in read mode: prompt, metadata chips, actions, and the collapsible
 * model answer. Extracted verbatim from the former 843-line
 * course-question-bank.tsx.
 */
export function QuestionRowDisplay({
  item,
  controllers,
}: {
  item: InterviewQuestionBankItemRead;
  controllers: QuestionRowControllers;
}) {
  const { filters, editor, deletion, view } = controllers;
  const answerOpen = view.expandedAnswers.has(item.id);
  const hasAnswer = Boolean((item.model_answer ?? "").trim());
  return (
    <div className="p-3.5">
      <div className="flex items-start gap-3">
        {/* Explicit gutter, not just a gap: the action column is fixed-width,
            so cap the text block instead of letting flex shrink decide how
            close the prompt gets to Edit. */}
        <div className="min-w-0 flex-1 space-y-2 pr-4 sm:max-w-[calc(100%-9rem)]">
          <p className="text-sm font-medium leading-relaxed text-m3-on-surface transition-colors group-hover:text-m3-primary">
            {item.prompt_text}
          </p>
          <QuestionRowMeta item={item} filters={filters} />
        </div>

        {/* Actions fade up to full strength on row hover so a long list isn't a
            wall of icons, but stay reachable by keyboard (focus-within) and
            always visible on touch. */}
        <QuestionRowActions item={item} editor={editor} deletion={deletion} />
      </div>

      {/* Model answer was inlined in full, so one long answer pushed every
          other question off screen. Collapsed by default, same grid-rows
          animation as the help panel. */}
      {hasAnswer && (
        <QuestionModelAnswer
          item={item}
          answerOpen={answerOpen}
          onToggle={() => view.toggleAnswer(item.id)}
        />
      )}
    </div>
  );
}

import { QuizQuestionCard } from "@/routes/_components/QuizQuestionCard";
import type { QuizStageProps } from "./types";

/** Question cards for the current page. */
export function QuizPageQuestions({
  session,
}: Pick<QuizStageProps, "session">) {
  const {
    pageQuestions,
    pageStart,
    statuses,
    setStatuses,
    displayQuestions,
    activeIdx,
    setActiveIdx,
    submitAttempt,
    perQuestionCooldown,
    focusTime,
  } = session;

  return (
    <div className="space-y-6">
      {pageQuestions.map((question, offset) => {
        const index = pageStart + offset;
        const status = statuses[index];
        if (!status) return null;
        return (
          <QuizQuestionCard
            key={question.id}
            question={question}
            index={index}
            total={displayQuestions.length}
            status={status}
            isActive={index === activeIdx}
            disabled={submitAttempt.isPending}
            cooldownRetryAt={perQuestionCooldown[question.id] ?? null}
            registerRef={focusTime.register(question.id)}
            peekFocusMs={() => focusTime.peekFocusMs(question.id)}
            onFocusQuestion={() => setActiveIdx(index)}
            onSelectOption={(optionId) => {
              setStatuses((current) =>
                current.map((s, i) =>
                  i === index
                    ? {
                        ...s,
                        selectedOptionId: optionId,
                        savedToServer: false,
                      }
                    : s,
                ),
              );
            }}
            onAnswerTextChange={(value) => {
              setStatuses((current) =>
                current.map((s, i) =>
                  i === index
                    ? { ...s, answerText: value, savedToServer: false }
                    : s,
                ),
              );
            }}
          />
        );
      })}
    </div>
  );
}

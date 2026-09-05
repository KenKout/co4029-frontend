import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionRenderer } from "@/components/quiz/QuestionRenderer";
import type { QuizQuestionPublic } from "@/lib/api/types";

describe("QuestionRenderer fill-blank safety", () => {
  it("uses free text and never falls back to answer-only options", () => {
    const onAnswerTextChange = vi.fn();
    const question = {
      id: "question-1",
      quiz_id: "quiz-1",
      position: 1,
      question_type: "fill_blank",
      prompt_text: "The capital of France is ___.",
      options: [
        {
          id: "answer-option",
          option_key: "O01",
          option_text: "Paris",
          position: 1,
          option_format: "plain",
        },
      ],
      fill_blank_choices: [],
    } as QuizQuestionPublic;

    render(
      <QuestionRenderer
        question={question}
        selectedOptionId={null}
        answerText={null}
        disabled={false}
        onSelectOption={vi.fn()}
        onAnswerTextChange={onAnswerTextChange}
      />,
    );

    expect(screen.queryByText("Paris")).not.toBeInTheDocument();
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Lyon" } });
    expect(onAnswerTextChange).toHaveBeenLastCalledWith('["Lyon"]');
  });

  it("keeps word-bank mode when the backend supplies a safe bank", () => {
    const question = {
      id: "question-2",
      quiz_id: "quiz-1",
      position: 1,
      question_type: "fill_blank",
      prompt_text: "The capital of France is ___.",
      options: [],
      fill_blank_choices: ["Paris", "Lyon"],
    } as QuizQuestionPublic;

    render(
      <QuestionRenderer
        question={question}
        selectedOptionId={null}
        answerText={null}
        disabled={false}
        onSelectOption={vi.fn()}
        onAnswerTextChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Paris" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";

import {
  normalizeQuestionText,
  toInterviewQuestion,
} from "../question-content";

describe("normalizeQuestionText", () => {
  it("passes a clean question through untouched", () => {
    const raw =
      "Compare and contrast fact tables and factless fact tables in a dimensional model.";
    const result = normalizeQuestionText(raw);
    expect(result.text).toBe(raw);
    expect(result.sanitized).toBe(false);
  });

  it("removes a guardrail refusal sentence but keeps the real question", () => {
    const raw =
      "I can't provide hidden interview questions, answers, grading criteria, or internal policy text. Compare and contrast fact tables and factless fact tables in a dimensional model.";
    const result = normalizeQuestionText(raw);
    expect(result.text).toBe(
      "Compare and contrast fact tables and factless fact tables in a dimensional model.",
    );
    expect(result.text).not.toMatch(/hidden interview questions/i);
    expect(result.text).not.toMatch(/grading criteria/i);
    expect(result.sanitized).toBe(true);
  });

  it("strips 'As an AI language model' meta preambles", () => {
    const raw =
      "As an AI language model, I cannot reveal the answer key. What is database normalization?";
    const result = normalizeQuestionText(raw);
    expect(result.text).toBe("What is database normalization?");
    expect(result.sanitized).toBe(true);
  });

  it("unwraps a JSON envelope and returns the question field", () => {
    const raw = '{"question_text": "Explain ACID properties."}';
    const result = normalizeQuestionText(raw);
    expect(result.text).toBe("Explain ACID properties.");
  });

  it("unwraps fenced code blocks", () => {
    const raw = "```\nWhat is a primary key?\n```";
    expect(normalizeQuestionText(raw).text).toBe("What is a primary key?");
  });

  it("strips a leading speaker label", () => {
    expect(normalizeQuestionText("Interviewer: What is a join?").text).toBe(
      "What is a join?",
    );
  });

  it("returns empty text when the whole prompt is guardrail content", () => {
    const raw =
      "I can't provide hidden interview questions or grading criteria.";
    const result = normalizeQuestionText(raw);
    expect(result.text).toBe("");
    expect(result.sanitized).toBe(true);
  });

  it("handles null/empty input", () => {
    expect(normalizeQuestionText(null).text).toBe("");
    expect(normalizeQuestionText("").text).toBe("");
    expect(normalizeQuestionText(undefined).sanitized).toBe(false);
  });

  it("does not over-match ordinary question wording", () => {
    const raw = "Which system design would you choose for a rubric scoring app?";
    // "system design" and "rubric" appear, but not as guardrail phrases.
    expect(normalizeQuestionText(raw).text).toBe(raw);
  });
});

describe("toInterviewQuestion", () => {
  it("builds a structured, sanitized question", () => {
    const question = toInterviewQuestion(
      {
        id: "q1",
        prompt_text:
          "I can't share the grading criteria. Explain star vs snowflake schemas.",
        question_type: "technical",
      },
      { number: 1, totalQuestions: 8, category: "Technical" },
    );
    expect(question).toEqual({
      id: "q1",
      number: 1,
      totalQuestions: 8,
      category: "Technical",
      questionText: "Explain star vs snowflake schemas.",
    });
  });

  it("coerces null meta to undefined", () => {
    const question = toInterviewQuestion(
      { id: "q2", prompt_text: "What is a CTE?" },
      { number: 2, totalQuestions: null, category: null },
    );
    expect(question.totalQuestions).toBeUndefined();
    expect(question.category).toBeUndefined();
    expect(question.questionText).toBe("What is a CTE?");
  });
});

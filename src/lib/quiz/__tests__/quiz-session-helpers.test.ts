import { describe, expect, it } from "vitest";
import {
  EMPTY_STATUS,
  formatDuration,
  formatTime,
  hasAnswer,
  questionState,
  type QuestionStatus,
} from "@/lib/quiz/quiz-session-helpers";

const answered: QuestionStatus = {
  ...EMPTY_STATUS,
  selectedOptionId: "opt-1",
};

describe("formatTime", () => {
  it("pads mm:ss", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(9)).toBe("00:09");
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(600)).toBe("10:00");
  });
});

describe("formatDuration", () => {
  it("uses mm:ss under an hour", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(75)).toBe("01:15");
  });
  it("adds an hour segment at/over an hour", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3661)).toBe("1:01:01");
  });
  it("clamps negatives to zero", () => {
    expect(formatDuration(-10)).toBe("00:00");
  });
});

describe("hasAnswer", () => {
  it("is true with a selected option", () => {
    expect(hasAnswer(answered)).toBe(true);
  });
  it("is true with non-empty free text", () => {
    expect(hasAnswer({ ...EMPTY_STATUS, answerText: "x" })).toBe(true);
  });
  it("is false when blank", () => {
    expect(hasAnswer(EMPTY_STATUS)).toBe(false);
    expect(hasAnswer({ ...EMPTY_STATUS, answerText: "" })).toBe(false);
  });
});

describe("questionState", () => {
  it("flagged wins over everything", () => {
    expect(questionState(0, 0, { ...answered, flagged: true })).toBe("flagged");
  });
  it("answered is completed", () => {
    expect(questionState(2, 0, answered)).toBe("completed");
  });
  it("the active index is active when unanswered", () => {
    expect(questionState(1, 1, EMPTY_STATUS)).toBe("active");
  });
  it("everything else is pending", () => {
    expect(questionState(3, 1, EMPTY_STATUS)).toBe("pending");
  });
});

import { describe, expect, it } from "vitest";

import { isHintRequestText } from "../helpers";

describe("isHintRequestText", () => {
  it.each([
    // English imperative / interrogative requests
    "Can you give me more hints",
    "can you give me a hint?",
    "Could you give me another hint",
    "Please give me a hint",
    "give me a hint",
    "give me hints please",
    "gimme a hint",
    "Give me some hints",
    "Can I have a hint?",
    "I need a hint",
    "I want more hints",
    "I'd like another hint",
    "more hints please",
    "another hint",
    "a hint please",
    "hint please",
    // Vietnamese requests
    "cho tôi một gợi ý",
    "cho mình gợi ý nhé",
    "bạn cho tôi gợi ý thêm đi",
    "hãy cho tôi một gợi ý",
    "gợi ý thêm",
    "cho em một gợi ý nhỏ",
    "xin gợi ý",
    "thêm gợi ý",
  ])("matches a bare hint request: %s", (text) => {
    expect(isHintRequestText(text)).toBe(true);
  });

  it.each([
    // Answers that merely mention hints must NOT be hijacked
    "The hint is to think about the difference between transactions and decisions",
    "I think the hint about operational processing is really helpful for my answer",
    "My answer uses the hint you gave me about the data warehouse",
    "That hint about customer data was useful, so here is my full answer: a data warehouse consolidates all sources into one place, which solves the unified view problem because every team queries the same store",
    "I don't know",
    "Xà Điểu",
    "Skip the setup",
    "I'm ready to begin",
    "The main difference is that operational processing records day-to-day transactions while information processing supports decision making",
    "Can you repeat the question",
    "what does ERP mean?",
    "please clarify the question",
    "",
    "   ",
    // Long text over the 100-char cap
    "Can you give me more hints please because I am really struggling with this question and would appreciate any additional help you can offer me today",
  ])("does not hijack a non-hint text: %s", (text) => {
    expect(isHintRequestText(text)).toBe(false);
  });
});

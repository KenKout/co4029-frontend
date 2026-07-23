import { describe, expect, it } from "vitest";

import {
  planTransition,
  transitionHoldMs,
  VOICE_BEAT_MS,
} from "../transition-sequencing";

const FALLBACK = "Thank you. Now let's move on to the next question.";

describe("planTransition", () => {
  it("plans a next-question transition from the server transition text", () => {
    const plan = planTransition(
      {
        next_question: { id: "q2", prompt_text: "Q2?" },
        transition_text: "Thank you. Let's move on to the next question.",
      },
      FALLBACK,
    );
    expect(plan).toEqual({
      showTransition: true,
      text: "Thank you. Let's move on to the next question.",
      target: "next_question",
    });
  });

  it("falls back to the localized transition when the backend omits it (mixed-version)", () => {
    const plan = planTransition(
      { next_question: { id: "q2", prompt_text: "Q2?" } },
      FALLBACK,
    );
    expect(plan).toEqual({
      showTransition: true,
      text: FALLBACK,
      target: "next_question",
    });
  });

  it("plans a closing transition on a finished turn", () => {
    const plan = planTransition(
      {
        is_finished: true,
        transition_text: "Thank you. That was the final question.",
      },
      FALLBACK,
    );
    expect(plan).toEqual({
      showTransition: true,
      text: "Thank you. That was the final question.",
      target: "closing",
    });
  });

  it("returns null on a finished turn with no transition text (close immediately)", () => {
    expect(planTransition({ is_finished: true }, FALLBACK)).toBeNull();
    expect(planTransition({ should_finish: true }, FALLBACK)).toBeNull();
  });

  it("returns null when there is neither a next question nor a finish", () => {
    // A same-question probe/clarify turn is handled separately — no transition.
    expect(planTransition({ next_question: null }, FALLBACK)).toBeNull();
  });

  it("prefers should_finish over is_finished for the closing decision", () => {
    const plan = planTransition(
      {
        should_finish: true,
        is_finished: false,
        next_question: { id: "q2" },
        transition_text: "Thank you. That was the final question.",
      },
      FALLBACK,
    );
    expect(plan?.target).toBe("closing");
  });
});

describe("transitionHoldMs", () => {
  it("uses a short fixed conversational beat when voice is enabled", () => {
    expect(
      transitionHoldMs("any length of text here", { voiceEnabled: true }),
    ).toBe(VOICE_BEAT_MS);
  });

  it("clamps a very short transition up to the 900ms floor when voice is off", () => {
    // 2 words × 180ms = 360ms → clamped up to 900ms.
    expect(transitionHoldMs("Next question", { voiceEnabled: false })).toBe(
      900,
    );
  });

  it("scales with word count between the bounds when voice is off", () => {
    // 8 words × 180 = 1440ms (within [900, 2800]).
    const text = "one two three four five six seven eight";
    expect(transitionHoldMs(text, { voiceEnabled: false })).toBe(1440);
  });

  it("clamps a very long transition down to the 2800ms ceiling when voice is off", () => {
    const text = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    expect(transitionHoldMs(text, { voiceEnabled: false })).toBe(2800);
  });
});
